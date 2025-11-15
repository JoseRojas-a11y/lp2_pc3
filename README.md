# NextTalk — Chat en Tiempo Real (v2)

![Java](https://img.shields.io/badge/Java-24-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-blue)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Maven](https://img.shields.io/badge/Maven-Build-red)

## Descripción

NextTalk es una aplicación de mensajería en tiempo real que soporta:
- Autenticación y registro de usuarios.
- Mensajería de texto y transferencia de archivos.
- Videollamadas grupales con WebRTC (topología mesh).

El backend fue rediseñado con principios SOLID y una ruta única de persistencia mediante un servicio de auditoría que registra todas las acciones en MySQL. El frontend usa ES6 modules y CSS modular.

---

## Arquitectura

### Backend (Java)
- `WebSocketServer` del proyecto [Java-WebSocket]. El servidor (`ChatWebSocketServer`) se limita a:
  - Ciclo de vida de conexiones (abrir/cerrar/errores).
  - Despachar mensajes entrantes a handlers especializados.
- `MessageDispatcher` + `ServerMessageHandler` (Strategy): cada tipo de mensaje tiene un handler dedicado en `server.service.handlers`.
- `MessageContext`: entrega a los handlers el estado compartido (sesiones, usuarios en video), servicios (DAO, `AuditService`) y utilidades (JSON, broadcast).
- `AuditService`: única fuente de persistencia. Registra `SYSTEM`, `LOGIN`, `LOGOUT`, `TEXT`, `FILE`, `VIDEO_JOIN`, `VIDEO_LEAVE` y detalles en tablas normalizadas.
- DAO stateless (`UserDAO`, `ActionDAO`): cada método abre/cierra su propia `Connection` desde un `DataSource` (via `DBConnection`).

Handlers incluidos:
- `AuthHandler`, `RegisterHandler`, `LogoutHandler`
- `TextHandler`, `FileHandler`
- `JoinRoomHandler`, `LeaveRoomHandler`
- `WebRTCOfferHandler`, `WebRTCAnswerHandler`, `WebRTCIceHandler`

Ruta de persistencia única:
- Todos los registros de acciones pasan por `AuditService`.
- El manejo de archivos y su persistencia se realiza exclusivamente en `FileHandler` (evita duplicidades).

### Frontend (JavaScript)
- ES6 modules (sin frameworks) bajo `frontend/frontend`.
- Gestores (Singleton): `UIManager`, `WebSocketManager`, `FileManager`, `VideoCallManager`.
- `MessageHandler` (Strategy) para procesar mensajes del servidor.
- CSS modular con carga paralela por múltiples `<link>`.

---

## Estructura de Proyecto

```
PC3/
├── backend/                      # Código Java (análogo a src/main/java/server)
│   ├── ChatWebSocketServer.java
│   ├── MainServer.java
│   ├── Config.java
│   ├── dao/
│   │   ├── DBConnection.java
│   │   ├── UserDAO.java
│   │   └── ActionDAO.java
│   ├── model/
│   │   └── User.java
│   └── service/
│       ├── AuditService.java
│       ├── MessageContext.java
│       ├── MessageDispatcher.java
│       ├── ServerMessageHandler.java
│       └── handlers/
│           ├── AuthHandler.java
│           ├── RegisterHandler.java
│           ├── LogoutHandler.java
│           ├── TextHandler.java
│           ├── FileHandler.java
│           ├── JoinRoomHandler.java
│           ├── LeaveRoomHandler.java
│           ├── WebRTCOfferHandler.java
│           ├── WebRTCAnswerHandler.java
│           └── WebRTCIceHandler.java
├── frontend/                     # Frontend (ES6 modules + CSS modular)
│   ├── index.html
│   ├── app.js
│   ├── chatDetails/
│   │   ├── config.js
│   │   ├── ChatApplication.js
│   │   ├── handlers/MessageHandler.js
│   │   ├── managers/
│   │   │   ├── WebSocketManager.js
│   │   │   ├── UIManager.js
│   │   │   ├── FileManager.js
│   │   │   └── VideoCallManager.js
│   │   └── utils/
│   │       ├── DOMUtils.js
│   │       └── FileUtils.js
│   └── styles/
│       ├── _variables.css
│       ├── _base.css
│       ├── layout/chat-layout.css
│       ├── components/
│       │   ├── messages.css
│       │   └── files.css
│       ├── features/
│       │   ├── auth.css
│       │   └── video-call.css
│       ├── utilities.css
│       └── responsive.css
├── documentación/                # Documentación funcional y técnica
│   ├── BACKEND_ARCHITECTURE.md   # Arquitectura backend (handlers, flujo, auditoría)
│   ├── FRONTEND_ARCHITECTURE.md  # Arquitectura frontend (managers, patrones)
│   ├── database/                 # Scripts SQL y notas de BD
│   │   └── create_tables.sql
│   └── diagrams/
│       ├── SEQUENCE_DIAGRAMS.md  # Diagramas de secuencia (PlantUML)
│       ├── diagrama_unificado/
│       │   ├── unified_flow.puml
│       │   ├── UnifiedFlowDetailed.png
│       │   └── UnifiedFlowDetailed.svg
│       └── diagramas_especificos/
│           ├── auth_flow/
│           │   └── auth_flow.puml
│           ├── text_message/
│           │   └── text_message.puml
│           ├── file_transfer/
│           │   └── file_transfer.puml
│           ├── video_join/
│           │   └── video_join.puml
│           └── webrtc_signal/
│               └── webrtc_signal.puml
├── pom.xml
├── README.md
└── REGISTRO_USUARIOS.md
```

Referencias rápidas:
- Arquitectura Backend: `documentación/BACKEND_ARCHITECTURE.md`
- Arquitectura Frontend: `documentación/FRONTEND_ARCHITECTURE.md`
- Diagramas (secuencia / flujo unificado): `documentación/diagrams/`
- Esquema y creación de tablas: `documentación/database/create_tables.sql`

---

## Requisitos

- Java JDK 24+
- Maven 3.x
- MySQL 8.0+
- Navegador moderno (Chrome/Firefox/Edge)
- Visual Studio Code (recomendado) + extensión Live Server

---

## Configuración Rápida

### 1) Base de datos

Ejecuta el script incluido (crea DB, tablas y datos de ejemplo):

```powershell
# Desde la raíz del proyecto (Windows PowerShell)
mysql -u root -p < .\database\create_tables.sql
```

### 2) Variables de entorno (BD y servidor)

El backend usa `MysqlDataSource` configurado por variables de entorno:

```powershell
# Base de datos
$env:DB_HOST='localhost'
$env:DB_PORT='3306'
$env:DB_NAME='chatapp'
$env:DB_USER='root'
$env:DB_PASS='tu_contraseña'

# Servidor Java
$env:JAVA_HOST='localhost'
$env:JAVA_WS_PORT='8081'
```

### 3) Compilación y ejecución

```powershell
cd C:\Users\jose\Desktop\PC3
mvn clean compile
mvn exec:java -Dexec.mainClass="server.MainServer"
```

El servidor inicia en: `ws://localhost:8081/`

### 4) Frontend

Opción A (VS Code Live Server):
1. Abrir el proyecto en VS Code.
2. Abrir `frontend/index.html` y seleccionar “Open with Live Server”.
3. Navegar a `http://localhost:5500/frontend/index.html`.

Opción B (HTTP simple):
```powershell
cd .\frontend
python -m http.server 5500
```

---

## Configuración Centralizada

- Backend: `server.Config` lee `JAVA_HOST` y `JAVA_WS_PORT`.
- Frontend: `frontend/chatDetails/config.js` calcula `wsUrl` automáticamente y permite overrides con `localStorage`:

```js
localStorage.setItem('WS_HOST', '192.168.1.50');
localStorage.setItem('WS_PORT', '9090');
location.reload();
```

---

## Modelo de Datos (Auditoría)

Historial normalizado en 3 tablas. Todas las inserciones pasan por `AuditService`:

```sql
CREATE TABLE actions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action_type ENUM('SYSTEM','LOGIN','LOGOUT','TEXT','FILE','VIDEO_JOIN','VIDEO_LEAVE') NOT NULL,
  room VARCHAR(64) NOT NULL DEFAULT 'global',
  actor_user_id INT NULL,
  server_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE action_text_details (
  action_id BIGINT PRIMARY KEY,
  content TEXT NOT NULL,
  content_length INT NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE TABLE action_file_details (
  action_id BIGINT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(128) NOT NULL,
  size BIGINT NOT NULL,
  data LONGBLOB NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);
```

Reglas clave:
- Se registra solo el envío del emisor (no duplicar por recepción).
- Archivos se guardan con bytes y metadatos en `FileHandler` vía `AuditService`.
- Acciones de sistema se marcan con `server_generated = TRUE`.

---

## Protocolo de Mensajes

Cliente → Servidor:
- `auth`: `{ type, username, password }`
- `register`: `{ type, username, fullName, password }`
- `text`: `{ type, content }`
- `file`: `{ type, filename, mimetype, size, data(base64) }`
- `join_room` / `leave_room`
- `webrtc_offer` / `webrtc_answer` / `webrtc_ice`
- `logout`

Servidor → Cliente (ejemplos):
- `auth_ok`, `register_ok`
- `userlist`: `{ type, users: [...] }`
- `text`: `{ type, from, content, timestamp }`
- `file`: `{ type, from, filename, mimetype, size, data, timestamp }`
- `user_joined`, `user_left`, `room_users`
- Señalización WebRTC: `webrtc_*`

---

## Seguridad

Implementado:
- SQL con `PreparedStatement` (prevención de inyección).
- Validación de credenciales y unicidad de sesión por usuario.
- Validaciones básicas de payload.

Recomendado para producción:
- Hash de contraseñas (bcrypt/Argon2).
- HTTPS/WSS y políticas CORS.
- Rate limiting y límites de tamaño de archivo.
- JWT para sesiones y expiración de sesión.

---

## Rendimiento

- Estructuras concurrentes (`ConcurrentHashMap`).
- Broadcast selectivo (archivos no se reenvían al remitente).
- Thread pool para manejo de mensajes.

---

## Desarrollo y Pruebas

Backend:
```powershell
mvn -q -DskipTests=false test
```

Frontend (propuesto): Jest/Playwright según necesidades.

Guía de estilo:
- Java: nombres descriptivos, JavaDoc en públicos.
- JS: ES6, const/let, JSDoc donde aplique.

---

## Créditos y Licencia

Proyecto académico — Lenguaje de Programación 2 (UNI, 2025-II).
Uso educativo únicamente. No apto para producción sin endurecimiento de seguridad.

Equipo:
- Jose Rojas
- Isabel Ávila
- Mauricio Chinchayhura
- Frabicio Zúñiga

---

Última actualización: 14 de Noviembre, 2025  
Versión: 2.0.0  
Estado: Estable para desarrollo
