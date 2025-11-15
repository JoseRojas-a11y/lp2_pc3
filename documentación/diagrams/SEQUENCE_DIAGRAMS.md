# NextTalk — Diagramas de Secuencia (UML)

Formato: PlantUML para integración rápida. Cada diagrama representa un flujo clave end-to-end entre Frontend (cliente), Servidor WebSocket y Servicios internos.

---
## 1. Autenticación (login)
```plantuml
@startuml AuthFlow
actor User as U
participant "Browser / Frontend" as FE
participant "WebSocketManager" as WSM
participant "ChatWebSocketServer" as S
participant "MessageDispatcher" as D
participant "AuthHandler" as AH
participant "UserDAO" as UD
participant "AuditService" as AS

U -> FE: Ingresa credenciales
FE -> WSM: authenticate(username, password)
WSM -> S: JSON {type:"auth", username, password}
S -> D: dispatch("auth")
D -> AH: handle(ctx, conn, payload)
AH -> UD: authenticate(username, password)
UD --> AH: User|null
AH -> AS: recordLogin(username) [si válido]
AH -> WSM: JSON {type:"auth_ok", username}
AH -> S: broadcast userlist
S -> WSM: JSON {type:"userlist", users}
WSM -> FE: notifica auth_ok + userlist
FE -> U: Muestra pantalla de chat
@enduml
```

---
## 2. Mensaje de texto
```plantuml
@startuml TextMessage
actor User as U
participant FE
participant WSM
participant S
participant D
participant "TextHandler" as TH
participant AS

U -> FE: Escribe y enviar mensaje
FE -> WSM: send({type:"text", content})
WSM -> S: JSON text
S -> D: dispatch("text")
D -> TH: handle(...)
TH -> AS: recordText(username, content)
TH -> S: broadcast({type:"text", from, content, timestamp})
S -> WSM: JSON text (a todos)
WSM -> FE: render mensaje
@enduml
```

---
## 3. Transferencia de archivo
```plantuml
@startuml FileTransfer
actor User as U
participant FE
participant "FileManager" as FM
participant WSM
participant S
participant D
participant "FileHandler" as FH
participant AS

U -> FE: Selecciona archivo
FE -> FM: sendFile(file)
FM -> FM: Leer + Base64 encode
FM -> WSM: send({type:"file", filename, mimetype, size, data})
WSM -> S: JSON file
S -> D: dispatch("file")
D -> FH: handle(...)
FH -> FH: Base64 decode bytes
FH -> AS: recordFile(username, filename, mimetype, size, bytes)
FH -> S: broadcastExcept(sender, {type:"file", ...})
S -> WSM: JSON file (otros usuarios)
WSM -> FE: renderFileMessage
@enduml
```

---
## 4. Videollamada: ingreso a sala
```plantuml
@startuml VideoJoin
actor User as U
participant FE
participant "VideoCallManager" as VCM
participant WSM
participant S
participant D
participant "JoinRoomHandler" as JRH
participant AS

U -> FE: Click "Unirse a llamada"
FE -> VCM: joinCall()
VCM -> WSM: send({type:"join_room"})
WSM -> S: JSON join_room
S -> D: dispatch("join_room")
D -> JRH: handle(...)
JRH -> JRH: wasEmpty? registrar inicio
JRH -> AS: recordSystem("Videollamada iniciada") [si estaba vacía]
JRH -> AS: recordVideoJoin(username)
JRH -> S: send(conn, room_users)
S -> WSM: JSON {type:"room_users", users}
WMS -> VCM: handleRoomUsers(users)
VCM -> VCM: Crear PeerConnections + getUserMedia
@enduml
```

---
## 5. Señalización WebRTC (Oferta / Respuesta / ICE)
```plantuml
@startuml WebRTCSignal
actor Caller as C
actor Callee as B
participant FE_C as "Frontend Caller"
participant VCM_C as "VideoCallManager C"
participant WSM_C as "WSM C"
participant FE_B as "Frontend Callee"
participant WSM_B as "WSM B"
participant S
participant D
participant "WebRTCOfferHandler" as OFH
participant "WebRTCAnswerHandler" as ANH
participant "WebRTCIceHandler" as ICEH

== Oferta ==
C -> FE_C: Inicia conexión P2P
FE_C -> VCM_C: createOffer()
VCM_C -> WSM_C: send({type:"webrtc_offer", to:B, offer})
WSM_C -> S: JSON offer
S -> D: dispatch("webrtc_offer")
D -> OFH: handle(...)
OFH -> WSM_B: JSON {type:"webrtc_offer", from:C, offer}
WSM_B -> FE_B: onMessage(offer)
FE_B -> FE_B: setRemoteDescription + createAnswer
FE_B -> WSM_B: send({type:"webrtc_answer", to:C, answer})

== Respuesta ==
WSM_B -> S: JSON answer
S -> D: dispatch("webrtc_answer")
D -> ANH: handle(...)
ANH -> WSM_C: JSON {type:"webrtc_answer", from:B, answer}
WSM_C -> FE_C: onMessage(answer)
FE_C -> FE_C: setRemoteDescription

== ICE Candidates ==
FE_C -> WSM_C: send({type:"webrtc_ice", to:B, candidate})
WSM_C -> S: JSON ice
S -> D: dispatch("webrtc_ice")
D -> ICEH: handle(...)
ICEH -> WSM_B: JSON {type:"webrtc_ice", from:C, candidate}
WSM_B -> FE_B: addIceCandidate
@enduml
```

---
## Notas
- Todos los registros de auditoría (login, texto, archivo, video join/leave, sistema) se realizan exclusivamente a través de `AuditService`.
- Los diagramas omiten detalles de manejo de errores para claridad.
- Para nuevos tipos de mensaje, se agrega un handler y se registra en `ChatWebSocketServer.onStart()`.

---
## Exportación
Puedes usar PlantUML local o en línea:
```bash
# Ejemplo usando Docker
docker run --rm -v "$PWD":/workspace plantuml/plantuml -tpng SEQUENCE_DIAGRAMS.md
```

O copiar cada bloque `@startuml ... @enduml` a un archivo `.puml` y procesar.
