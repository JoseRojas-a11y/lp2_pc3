# NextTalk — Arquitectura de Backend (Handlers y Flujos)

Este documento describe la arquitectura del backend enfocada en:
- Patrón de despacho por tipo de mensaje (Strategy) con handlers.
- Contexto compartido para handlers.
- Servicio de auditoría como única ruta de persistencia.
- Flujos de mensajes más relevantes (texto, archivos, videollamada, auth).

---

## Objetivos de Diseño
- Separar responsabilidades (SOLID): el servidor WebSocket administra conexiones; los handlers encapsulan la lógica de negocio.
- Evitar duplicidades de persistencia: todas las acciones se registran mediante `AuditService`.
- Extensibilidad: agregar un nuevo tipo de mensaje no requiere modificar el servidor, solo registrar un nuevo handler.

---

## Componentes Clave

- `server.ChatWebSocketServer`
  - Gestiona ciclo de vida WS (`onStart`, `onOpen`, `onMessage`, `onClose`, `onError`).
  - Construye `MessageContext` y registra handlers en `MessageDispatcher`.
  - Delegación total de negocio a handlers; binarios se retransmiten como compatibilidad básica.

- `server.service.MessageDispatcher`
  - Registro `type -> handler`.
  - `dispatch(ctx, conn, type, payload)`: envía al handler; si no existe, responde con `{type:"error", msg:"unknown type"}`.

- `server.service.MessageContext`
  - Estado compartido: `sessions` (`Map<WebSocket,User>`), `videoRoomUsers` (`Map<String,WebSocket>`).
  - Acceso a servicios: `UserDAO`, `ActionDAO`, `AuditService`, `Gson`.
  - Utilidades: `json(...)`, `broadcast(...)`, `broadcastExcept(...)`, `currentUsers()`.

- `server.service.AuditService`
  - Única ruta de persistencia de acciones: `SYSTEM`, `LOGIN`, `LOGOUT`, `TEXT`, `FILE`, `VIDEO_JOIN`, `VIDEO_LEAVE`.
  - Inserta en `actions` y tablas de detalle (`action_text_details`, `action_file_details`).

- DAO (stateless) en `server.dao`
  - `DBConnection`: expone `DataSource` (MySQL) vía variables de entorno.
  - `UserDAO`: `authenticate`, `registerUser`.
  - `ActionDAO`: inserción de acciones y detalles; lookup de usuario.

---

## Handlers Registrados (type -> clase)
- `auth` -> `AuthHandler`
- `register` -> `RegisterHandler`
- `logout` -> `LogoutHandler`
- `text` -> `TextHandler`
- `file` -> `FileHandler`
- `join_room` -> `JoinRoomHandler`
- `leave_room` -> `LeaveRoomHandler`
- `webrtc_offer` -> `WebRTCOfferHandler`
- `webrtc_answer` -> `WebRTCAnswerHandler`
- `webrtc_ice` -> `WebRTCIceHandler`

Cada handler implementa `ServerMessageHandler` con:
```java
String type();
void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload);
```

---

## Flujos de Mensajes

### 1) Autenticación
Pasos:
1. Cliente envía `{ type: "auth", username, password }`.
2. `MessageDispatcher` despacha a `AuthHandler`.
3. `AuthHandler` valida credenciales (`UserDAO.authenticate`).
4. Si OK: añade a `sessions`, responde `auth_ok`, hace broadcast de `userlist` y `AuditService.recordLogin`.
5. Si falla: `auth_fail` y cierre con código 1008.

Secuencia (ASCII):
```
Client -> ChatWebSocketServer: onMessage("auth")
ChatWebSocketServer -> MessageDispatcher: dispatch("auth")
MessageDispatcher -> AuthHandler: handle(ctx, conn, payload)
AuthHandler -> UserDAO: authenticate
AuthHandler -> AuditService: recordLogin (si OK)
AuthHandler -> Client: auth_ok
AuthHandler -> All: userlist
```

### 2) Mensaje de Texto
Pasos:
1. Cliente envía `{ type: "text", content }`.
2. `TextHandler` verifica sesión.
3. Broadcast a todos con `{ type: "text", from, content, timestamp }`.
4. `AuditService.recordText`.

```
Client -> ... -> MessageDispatcher: "text"
Dispatcher -> TextHandler
TextHandler -> All: broadcast(text)
TextHandler -> AuditService: recordText
```

### 3) Envío de Archivo
Pasos:
1. Cliente envía `{ type: "file", filename, mimetype, size, data(base64) }`.
2. `FileHandler` verifica sesión, decodifica base64.
3. `AuditService.recordFile` (bytes + metadatos). ÚNICO punto de persistencia de archivos.
4. Broadcast del payload a todos EXCEPTO al remitente.

```
Client -> ... -> MessageDispatcher: "file"
Dispatcher -> FileHandler
FileHandler -> AuditService: recordFile(bytes)
FileHandler -> Others: broadcastExcept(file)
```

### 4) Videollamada (Join/Leave)
Join:
1. Cliente envía `{ type: "join_room" }`.
2. `JoinRoomHandler` agrega a `videoRoomUsers`, envía `room_users` actual al que entra.
3. Si la sala estaba vacía: `AuditService.recordSystem("Videollamada iniciada")`.
4. `AuditService.recordVideoJoin(username)` y `user_joined` a los demás.

Leave:
1. Cliente envía `{ type: "leave_room" }` o la conexión se cierra.
2. `LeaveRoomHandler` (o `onClose`) remueve usuario, `AuditService.recordVideoLeave`.
3. `user_left` a los demás; si queda vacía, `AuditService.recordSystem("Videollamada finalizada")`.

### 5) Señalización WebRTC
- `webrtc_offer`, `webrtc_answer`, `webrtc_ice` se reenvían al destino indicado en `to`.
- Solo usuarios en `videoRoomUsers` pueden intercambiar señalización.

```
Caller -> Dispatcher: webrtc_offer(to=X)
Dispatcher -> WebRTCOfferHandler
WebRTCOfferHandler -> X: webrtc_offer(from=Caller)
X -> Dispatcher: webrtc_answer(to=Caller)
Dispatcher -> WebRTCAnswerHandler -> Caller
```

### 6) Logout / Cierre de Conexión
- `LogoutHandler`: registra `LOGOUT` y cierra la conexión con código 1000.
- `onClose` del servidor: limpia `sessions`, sincroniza videollamada y registra en `AuditService` (logout + leave si aplicaba).

---

## Errores y Validaciones
- Tipo desconocido: `MessageDispatcher` responde `{type:"error", msg:"unknown type: ..."}`.
- No autenticado: varios handlers cierran la conexión con 1008.
- Base64 inválido en archivos: `FileHandler` invoca `AuditService.recordSystem("ERROR - Base64 inválido...")`.

---

## Extender con un Nuevo Mensaje
1. Crear clase en `server/service/handlers` que implemente `ServerMessageHandler`.
2. Implementar `type()` y `handle(...)` usando utilidades de `MessageContext` y persistencia vía `AuditService`.
3. Registrar el handler en `ChatWebSocketServer.onStart()` mediante `dispatcher.register(new MiNuevoHandler())`.

Ejemplo mínimo:
```java
public final class PingHandler implements ServerMessageHandler {
  @Override public String type() { return "ping"; }
  @Override public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> p) {
    conn.send(ctx.json("type","pong","ts",System.currentTimeMillis()));
  }
}
```

---

## Concurrencia y Seguridad
- `ConcurrentHashMap` para `sessions` y `videoRoomUsers`.
- Handlers son stateless; dependen de `MessageContext` (thread-safe para las estructuras compartidas).
- `AuditService` y DAOs abren/cerran conexión por operación (sin estado compartido mutable).

---

## Garantías de Persistencia
- Una sola ruta de escritura: `AuditService`.
- Archivos: persistidos únicamente en `FileHandler` con bytes y metadatos.
- Eventos de sistema: marcados con `server_generated = TRUE`.

---

## Referencias de Código
- Servidor: `src/main/java/server/ChatWebSocketServer.java`
- Contexto y despacho: `src/main/java/server/service/(MessageContext|MessageDispatcher|ServerMessageHandler).java`
- Servicio de auditoría: `src/main/java/server/service/AuditService.java`
- Handlers: `src/main/java/server/service/handlers/*.java`
- DAO y conexión: `src/main/java/server/dao/*.java`
- Esquema BD: `database/create_tables.sql`
