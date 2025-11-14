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
├── src/main/java/server/
│   ├── Config.java
│   ├── MainServer.java
│   ├── ChatWebSocketServer.java
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
├── frontend/frontend/
│   ├── index.html
│   ├── app.js
│   ├── js/
│   │   ├── config.js
│   │   ├── ChatApplication.js
│   │   ├── handlers/MessageHandler.js
│   │   ├── managers/(UIManager|WebSocketManager|FileManager|VideoCallManager).js
│   │   └── utils/(DOMUtils.js|FileUtils.js)
│   └── styles/
│       ├── _variables.css, _base.css, utilities.css, responsive.css
│       ├── layout/chat-layout.css
│       ├── components/(messages.css, files.css)
│       └── features/(auth.css, video-call.css)
├── database/create_tables.sql
├── pom.xml
├── README.md
└── REGISTRO_USUARIOS.md
```

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
2. Abrir `frontend/frontend/index.html` y seleccionar “Open with Live Server”.
3. Navegar a `http://localhost:5500/frontend/frontend/index.html`.

Opción B (HTTP simple):
```powershell
cd .\frontend\frontend
python -m http.server 5500
```

---

## Configuración Centralizada

- Backend: `server.Config` lee `JAVA_HOST` y `JAVA_WS_PORT`.
- Frontend: `frontend/frontend/js/config.js` calcula `wsUrl` automáticamente y permite overrides con `localStorage`:

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

Proyecto académico — Lenguaje de Programación 2 (UNI, 2025-I).
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

# NextTalk - Sistema de Chat en Tiempo Real

![Java](https://img.shields.io/badge/Java-24-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Maven](https://img.shields.io/badge/Maven-Build-red)

## 📋 Descripción del Proyecto

**NextTalk** es una aplicación de mensajería en tiempo real desarrollada como proyecto académico para el curso de Lenguaje de Programación 2. Permite comunicación instantánea mediante texto, transferencia de archivos y videollamadas grupales usando WebRTC, con arquitectura modular (JS y CSS), configuración centralizada y persistencia de acciones en base de datos MySQL (en lugar de logs en archivos).

### Características Principales

- 🔐 **Sistema de autenticación** con base de datos MySQL
- 👤 **Registro de usuarios** integrado
- 💬 **Chat en tiempo real** mediante WebSocket
- 📎 **Transferencia de archivos** con soporte para múltiples formatos
- 📹 **Videollamadas grupales** usando WebRTC (mesh topology)
- 🎨 **Interfaz moderna** responsive con ventana flotante de videollamada
- 🏗️ **Arquitectura modular** (JS y CSS) implementando patrones de diseño profesionales
- ⚙️ **Configuración centralizada** de host/puertos (Java y JS)
- 🪵 **Persistencia de acciones** en MySQL (acciones, textos y archivos)

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

#### Backend
- **Java 24** - Lenguaje principal del servidor
- **Maven** - Gestión de dependencias y build
- **Java-WebSocket 1.6.0** - Comunicación bidireccional en tiempo real
- **MySQL Connector/J 8.0.33** - Conexión con base de datos
- **Gson 2.13.1** - Serialización/deserialización JSON

#### Frontend
- **JavaScript ES6 (Vanilla)** - Sin frameworks externos
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con flexbox/grid y CSS modular
- **WebSocket API** - Cliente nativo del navegador
- **WebRTC API** - Comunicación peer-to-peer para video

#### Base de Datos
- **MySQL 8.0** - Almacenamiento de usuarios y acciones (historial)

### Patrones de Diseño Implementados y Mapeo

- Singleton
  - `UIManager`, `WebSocketManager`, `FileManager`, `VideoCallManager`
  - Única instancia por gestor para estado consistente
- Observer
  - `WebSocketManager` emite eventos: `open`, `message`, `close`, `error`; módulos se suscriben
- Strategy
  - `MessageHandler` despacha por `message.type` (`auth_ok`, `text`, `file`, `webrtc_*`, `register_*`, etc.)
- Facade
  - `ChatApplication` orquesta managers y listeners UI/WS
- DAO
  - `UserDAO`, `ActionDAO` y `DBConnection` aíslan acceso a datos (MySQL)
  - DAOs son stateless (cada método abre/cierra su propia `Connection` desde un `DataSource`)
- Utilidades/Abstracciones
  - `server.Config` (Java) y `frontend/js/config.js` (JS) centralizan configuración

---

## 📁 Estructura del Proyecto

```
PC3/
├── src/
│   └── main/java/server/
│       ├── Config.java                # Config central (host/puertos) via env
│       ├── ChatWebSocketServer.java   # Servidor WS (texto, archivos, WebRTC)
│       ├── MainServer.java            # Entry point; verifica BD y arranca WS
│       ├── dao/
│       │   ├── DBConnection.java      # Singleton con MysqlDataSource (env)
│       │   ├── UserDAO.java           # Autenticación y registro (stateless)
│       │   └── ActionDAO.java         # Acciones + detalles (stateless)
│       ├── model/
│       │   └── User.java
│       └── util/
│           └── ChatLogger.java        # Registra acciones en BD (no archivos)
├── frontend/frontend/
│   ├── js/
│   │   ├── config.js                  # Config FE: protocolo/host/puerto (WS)
│   │   ├── ChatApplication.js         # Facade principal
│   │   ├── handlers/MessageHandler.js
│   │   ├── managers/(UI/WebSocket/File/VideoCall)
│   │   └── utils/(DOMUtils.js, FileUtils.js)
│   ├── styles/
│   │   ├── _variables.css, _base.css
│   │   ├── layout/chat-layout.css
│   │   ├── components/(messages.css, files.css)
│   │   ├── features/(auth.css, video-call.css)
│   │   ├── utilities.css, responsive.css
│   ├── index.html                     # Carga estilos con múltiples <link>
│   └── app.js                         # Entrada (ES6 modules)
├── database/create_tables.sql
├── pom.xml
├── REGISTRO_USUARIOS.md
└── README.md
```

> Notas
> - Las carpetas `logs/` y `target/` están en `.gitignore` (artefactos de ejecución/build).

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Java JDK 24** o superior
- **Maven 3.x**
- **MySQL 8.0** o superior
- **Navegador moderno** (Chrome, Firefox, Edge)
- **Visual Studio Code** (recomendado) con Live Server extension

### 1. Configurar Base de Datos

```bash
# Iniciar sesión en MySQL
mysql -u root -p

# Ejecutar script de creación
source database/create_tables.sql

# O alternativamente
mysql -u root -p < database/create_tables.sql
```

#### Estructura de la Base de Datos

```sql
CREATE DATABASE chatapp;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
);
```

### 2. Configurar Conexión a BD

El backend usa `MysqlDataSource` con variables de entorno (no es necesario editar código):

- `DB_HOST` (por defecto: `localhost`)
- `DB_PORT` (por defecto: `3306`)
- `DB_NAME` (por defecto: `chatapp`)
- `DB_USER` (por defecto: `root`)
- `DB_PASS` (por defecto: `cambiar_me`)

Ejemplo en Windows PowerShell:

```powershell
$env:DB_HOST='localhost'
$env:DB_PORT='3306'
$env:DB_NAME='chatapp'
$env:DB_USER='root'
$env:DB_PASS='tu_contraseña'
```

### 3. Compilar y Ejecutar el Servidor

```bash
# Navegar al directorio del proyecto
cd C:\Users\jose\Desktop\PC3

# Compilar el proyecto
mvn clean compile

# Ejecutar el servidor (valores por defecto: host=localhost, WS=8081)
mvn exec:java -Dexec.mainClass="server.MainServer"

# Opcional: configurar host/puertos por variables de entorno (Windows PowerShell)
# (Usado por server.Config)
$env:JAVA_HOST='192.168.1.50'; $env:JAVA_WS_PORT='9090'; mvn exec:java -Dexec.mainClass="server.MainServer"
```
El servidor iniciará en:
- **WebSocket**: `ws://localhost:8081/`

### 4. Iniciar el Frontend

#### Opción A: Live Server (VS Code)
1. Abrir el proyecto en VS Code
2. Click derecho en `frontend/frontend/index.html`
3. Seleccionar "Open with Live Server"
4. Acceder a: `http://localhost:5500/frontend/frontend/index.html`

#### Opción B: Servidor HTTP Simple
```bash
cd frontend/frontend
python -m http.server 5500
```

---

## ⚙️ Configuración Centralizada (Host/Puertos)

#### Backend (Java)
- Clase: `server.Config`
- Variables de entorno soportadas:
  - `JAVA_HOST` (por defecto: `localhost`)
  - `JAVA_WS_PORT` (por defecto: `8081`)
- Uso interno: `MainServer` y `ChatWebSocketServer` consumen estos valores.

### Frontend (JS)
- Módulo: `frontend/frontend/js/config.js`
- Calcula `wsUrl` basado en protocolo, host y puerto; admite overrides en tiempo de ejecución con `localStorage`:
```js
localStorage.setItem('WS_HOST', '192.168.1.50');
localStorage.setItem('WS_PORT', '9090');
location.reload();
```
- `WebSocketManager` toma `CONFIG.wsUrl` por defecto.

---

## 📖 Guía de Uso

### Registro de Usuario

1. En la pantalla de login, clic en **"Regístrate aquí"**
2. Completar el formulario:
   - **Usuario**: Mínimo 3 caracteres (único)
   - **Nombre Completo**: Tu nombre visible
   - **Contraseña**: Mínimo 4 caracteres
   - **Confirmar Contraseña**: Debe coincidir
3. Clic en **"Crear Cuenta"**
4. Automáticamente ingresa al chat

### Inicio de Sesión

1. Ingresar **usuario** y **contraseña**
2. Clic en **"Iniciar Sesión"**
3. Esperar confirmación del servidor

### Enviar Mensajes

1. Escribir mensaje en el campo de texto
2. Presionar **Enter** o clic en botón **Enviar**
3. El mensaje se transmite a todos los usuarios conectados

### Enviar Archivos

1. Clic en el botón **📎** (clip)
2. Seleccionar archivo (máx. recomendado: 10MB)
3. El archivo se transmite automáticamente
4. Otros usuarios pueden descargar haciendo clic

### Videollamadas Grupales

#### Iniciar Videollamada
1. Clic en el botón **📹** (cámara) en el header
2. Permitir acceso a cámara y micrófono
3. Tu video aparece en la ventana flotante

#### Controles Durante la Llamada
- **🎤 Micrófono**: Silenciar/activar audio
- **📹 Cámara**: Desactivar/activar video
- **🖥️ Pantalla**: Compartir pantalla
- **⛶ Maximizar**: Expandir ventana de video
- **Salir**: Abandonar videollamada

#### Características de la Ventana de Video
- **Flotante y arrastrable**: Mover desde el header
- **Redimensionable**: Arrastrar esquina inferior derecha
- **No bloquea el chat**: Puedes seguir enviando mensajes
- **Responsive**: Se adapta a móviles automáticamente

---

## 🔧 Componentes Técnicos

### Backend - Servidor Java

#### MainServer.java
Punto de entrada principal que:
- Verifica conectividad con la base de datos (abre/cierra una `Connection`)
- Inicia servidor WebSocket en puerto configurado (`JAVA_WS_PORT`)

#### ChatWebSocketServer.java
Servidor WebSocket que maneja:
- **Autenticación**: `{type: "auth", username, password}`
- **Registro**: `{type: "register", username, fullName, password}`
- **Mensajes de texto**: `{type: "text", content}`
- **Archivos**: `{type: "file", filename, data, mimetype}` (se persisten bytes y metadatos en BD)
- **Videollamadas**: `join_room`, `leave_room`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice`
- **Logout**: `{type: "logout"}`

#### UserDAO.java
Acceso a datos de usuarios (stateless, por método):
```java
User authenticate(String username, String password)
User registerUser(String username, String fullName, String password)
```

#### ActionDAO.java
Persistencia de acciones e información detallada:
```java
long insertAction(String actionType, String room, Integer actorUserId, boolean serverGenerated)
void insertTextDetails(long actionId, String content)
void insertFileDetails(long actionId, String filename, String mimetype, long size, byte[] data)
Integer getUserIdByUsername(String username)
```

#### DBConnection.java
Singleton que provee un `DataSource` (`MysqlDataSource`) y entrega nuevas `Connection` por llamada.
Configurable por variables de entorno (`DB_*`).

#### ChatLogger.java
Logger semántico que ahora registra en BD (tabla `actions` y tablas de detalle). Evita duplicados:
- Acciones `TEXT`/`LOGIN`/`LOGOUT`/`VIDEO_*` se registran como eventos con detalles cuando corresponde.
- Archivos (`FILE`) no se registran desde el logger; se registran desde `ChatWebSocketServer` con bytes y metadatos.

### Frontend - Cliente JavaScript

#### ChatApplication.js (Facade)
Orquestador principal que:
- Inicializa todos los managers
- Configura event listeners
- Coordina flujos de trabajo

#### WebSocketManager.js (Singleton + Observer)
Gestión de conexión WebSocket:
```javascript
connect()                          // Conectar al servidor
authenticate(user, pass)           // Autenticar
register(user, fullName, pass)     // Registrar usuario
send(data)                         // Enviar datos
on(event, callback)                // Suscribir observador a eventos
off(event, callback)               // Cancelar suscripción
```

#### UIManager.js (Singleton)
Gestión de interfaz:
```javascript
showChatScreen(username)           // Mostrar chat
showLoginScreen()                  // Mostrar login
showRegisterScreen()               // Mostrar registro
renderTextMessage(from, content)   // Renderizar mensaje
renderUserList(users)              // Actualizar lista usuarios
```

#### FileManager.js (Singleton)
Gestión de archivos:
```javascript
sendFile(file)                     // Enviar archivo
receiveFile(from, filename, data)  // Recibir archivo
```

#### VideoCallManager.js (Singleton)
Gestión de videollamadas:
```javascript
joinCall()                         // Unirse a llamada
leaveCall()                        // Salir de llamada
toggleMicrophone()                 // Silenciar/activar mic
toggleCamera()                     // Activar/desactivar cámara
shareScreen()                      // Compartir pantalla
toggleMaximize()                   // Expandir/restaurar ventana
```

Características UI actuales:
- Ventana flotante arrastrable y responsiva.
- Modo reducido: muestra solo al participante prioritario (último en hablar o primero en unirse, excluyendo “yo” cuando hay remotos), sin lista de participantes, sin scroll interno.
- Modo maximizado: grilla con todos los participantes.

#### MessageHandler.js (Strategy)
Procesamiento de mensajes del servidor:
```javascript
handleMessage(message)             // Dispatch según tipo
handleAuthOk(msg)                  // Auth exitosa
handleRegisterOk(msg)              // Registro exitoso
handleTextMessage(msg)             // Mensaje de texto
handleFileMessage(msg)             // Mensaje de archivo
handleWebRTCOffer(msg)             // Oferta WebRTC
```

---

## 🔐 Seguridad

### Implementaciones Actuales
- ✅ Validación de credenciales en servidor
- ✅ Conexiones WebSocket únicas por usuario
- ✅ Validación de tipos de datos
- ✅ Sanitización de inputs en cliente
- ✅ PreparedStatements (prevención SQL injection)

### Mejoras Recomendadas para Producción
- ⚠️ **Hasheo de contraseñas**: Implementar bcrypt/Argon2
- ⚠️ **HTTPS/WSS**: Cifrado de comunicaciones
- ⚠️ **Tokens JWT**: Autenticación basada en tokens
- ⚠️ **Rate Limiting**: Prevenir spam y DDoS
- ⚠️ **Validación de archivos**: Escaneo de malware
- ⚠️ **CORS policies**: Restricción de orígenes
- ⚠️ **Session timeout**: Cierre automático de sesiones inactivas

---

## 🗄️ Modelo de Datos: Acciones en BD

Se normalizó el historial en tres tablas:

```sql
CREATE TABLE actions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action_type ENUM('SYSTEM', 'LOGIN', 'LOGOUT', 'TEXT', 'FILE', 'VIDEO_JOIN', 'VIDEO_LEAVE') NOT NULL,
  room VARCHAR(64) NOT NULL DEFAULT 'global',
  actor_user_id INT NULL,
  server_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
);

CREATE TABLE action_text_details (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  content_length INT NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE TABLE action_file_details (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action_id BIGINT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(128) NOT NULL,
  size BIGINT NOT NULL,
  data LONGBLOB NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);
```

- El servidor solo registra el “envío” del emisor (no duplicados por recepción).
- Los archivos se guardan con bytes y metadatos; su broadcast no incluye reenvío al remitente.
- `ChatLogger` usa `ActionDAO` y no escribe a archivos.

---

## 📡 Protocolo de Comunicación

### Mensajes Cliente → Servidor

#### Autenticación
```json
{
  "type": "auth",
  "username": "usuario123",
  "password": "contraseña"
}
```

#### Registro
```json
{
  "type": "register",
  "username": "nuevouser",
  "fullName": "Nombre Completo",
  "password": "contraseña"
}
```

#### Mensaje de Texto
```json
{
  "type": "text",
  "content": "Hola mundo"
}
```

#### Envío de Archivo
```json
{
  "type": "file",
  "filename": "documento.pdf",
  "mimetype": "application/pdf",
  "size": 102400,
  "data": "base64EncodedData..."
}
```

#### Unirse a Videollamada
```json
{
  "type": "join_room"
}
```

#### Oferta WebRTC
```json
{
  "type": "webrtc_offer",
  "to": "usuario_destino",
  "offer": {
    "type": "offer",
    "sdp": "..."
  }
}
```

### Mensajes Servidor → Cliente

#### Autenticación Exitosa
```json
{
  "type": "auth_ok",
  "username": "usuario123"
}
```

#### Registro Exitoso
```json
{
  "type": "register_ok",
  "username": "nuevouser"
}
```

#### Lista de Usuarios
```json
{
  "type": "userlist",
  "users": ["user1", "user2", "user3"]
}
```

#### Mensaje de Texto Broadcast
```json
{
  "type": "text",
  "from": "usuario123",
  "content": "Hola mundo",
  "timestamp": 1699724400000
}
```

#### Archivo Broadcast
```json
{
  "type": "file",
  "from": "usuario123",
  "filename": "documento.pdf",
  "mimetype": "application/pdf",
  "size": 102400,
  "data": "base64EncodedData...",
  "timestamp": 1699724400000
}
```

---
## 🧱 CSS Modular (arquitectura de estilos)

Estructura de estilos dividida por propósito para facilitar mantenibilidad y escalabilidad:

- `styles/_variables.css` → variables de tema y tokens.
- `styles/_base.css` → resets y componentes base (body, card, botones).
- `styles/layout/` → layout general del chat (sidebar, header, main).
- `styles/components/` → piezas reutilizables (messages, files, composer).
- `styles/features/` → vistas funcionales (auth, video-call).
- `styles/utilities.css` → utilidades (`.muted`, etc.).
- `styles/responsive.css` → reglas responsivas.
El `index.html` carga los estilos en paralelo mediante múltiples etiquetas `<link>` para mejorar el rendimiento; no se usa un archivo agregador con `@import`.

Beneficios: separación clara por dominios, menor choque de reglas, orden de carga controlado.

---

## 🎯 Características de WebRTC

### Topología de Red
- **Mesh Architecture**: Cada peer se conecta directamente con todos los demás
- **No usa servidor TURN**: Solo STUN para NAT traversal
- **Máximo recomendado**: 5-6 participantes simultáneos

### Servidores STUN Utilizados
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

### Flujo de Señalización

1. **Usuario A se une**
   - Solicita `getUserMedia()` (cámara + micrófono)
   - Envía `join_room` al servidor
   - Servidor responde con `room_users` (lista actual)

2. **Usuario B se une**
   - Repite proceso de A
   - Todos reciben `user_joined` con username de B
   - Usuario A crea `RTCPeerConnection` hacia B
   - A envía `webrtc_offer` a B vía servidor
   - B responde con `webrtc_answer`
   - Intercambian `webrtc_ice` candidates

3. **Establecimiento de conexión**
   - ICE gathering completo
   - Conexión P2P establecida
   - Streams de video/audio fluyen directamente

---

## 🐛 Solución de Problemas

### Servidor No Inicia

**Problema**: Error al iniciar MainServer
```
Error: Could not find or load main class server.MainServer
```

**Solución**:
```bash
# Limpiar y recompilar
mvn clean compile
mvn exec:java -Dexec.mainClass="server.MainServer"
```

### Error de Conexión a Base de Datos

**Problema**: 
```
SQLException: Access denied for user 'root'@'localhost'
```

**Solución**:
1. Verificar credenciales en `DBConnection.java`
2. Verificar que MySQL esté corriendo:
   ```bash
   # Windows
   net start MySQL80
   
   # Linux/Mac
   sudo service mysql start
   ```

### WebSocket No Conecta

**Problema**: Error en consola del navegador
```
WebSocket connection to 'ws://localhost:8081/' failed
```

**Solución**:
1. Verificar que el servidor Java esté corriendo
2. Verificar puerto correcto en `WebSocketManager.js`:
   ```javascript
   this.serverUrl = 'ws://localhost:8081/';
   ```
3. Verificar firewall no bloquee puerto 8081

### Video No Funciona

**Problema**: Cámara no se activa

**Solución**:
1. Verificar permisos del navegador (cámara/micrófono)
2. Usar HTTPS (WebRTC requiere contexto seguro)
3. Verificar que no haya otra app usando la cámara

### Archivos No Se Envían

**Problema**: Archivos grandes fallan

**Solución**:
1. Limitar tamaño de archivo (recomendado: < 10MB)
2. Para archivos grandes, implementar chunking:
   ```javascript
   const CHUNK_SIZE = 64 * 1024; // 64KB chunks
   ```

---

## 📊 Métricas y Rendimiento

### Capacidad del Servidor
- **Usuarios concurrentes**: ~100-200 (con 1 core CPU)
- **Mensajes/segundo**: ~1000
- **Videollamadas simultáneas**: Limitado por ancho de banda cliente

### Optimizaciones Implementadas
- ✅ Thread pool para conexiones WebSocket
- ✅ ConcurrentHashMap para usuarios conectados
- ✅ Broadcast selectivo (archivos solo a otros usuarios)
- ✅ ES6 Modules con carga lazy

### Optimizaciones Futuras
- ⏳ Compresión de mensajes (gzip)
- ⏳ WebSocket per-message deflate
- ⏳ Paginación de historial de mensajes
- ⏳ CDN para archivos estáticos
- ⏳ Load balancing multi-servidor

---
## 🪵 Persistencia y Logging

- `ChatLogger` registra eventos en BD usando `ActionDAO`.
- `ChatWebSocketServer` registra archivos (`FILE`) con bytes y metadatos.
- No se generan archivos de log; todo queda en `actions` y tablas de detalle.

---

## 🧪 Testing

### Testing Manual

1. **Test de Registro**
   ```
   ✓ Crear usuario nuevo
   ✓ Verificar usuario duplicado rechazado
   ✓ Validar campos obligatorios
   ✓ Confirmar ingreso automático al chat
   ```

2. **Test de Autenticación**
   ```
   ✓ Login con credenciales válidas
   ✓ Login con credenciales inválidas
   ✓ Verificar mensaje de error apropiado
   ```

3. **Test de Chat**
   ```
   ✓ Enviar mensaje de texto
   ✓ Recibir mensaje de otro usuario
   ✓ Verificar timestamp correcto
   ✓ Enviar archivo < 5MB
   ✓ Recibir y descargar archivo
   ```

4. **Test de Videollamada**
   ```
   ✓ Unirse a llamada (2 usuarios)
   ✓ Silenciar/activar micrófono
   ✓ Desactivar/activar cámara
   ✓ Compartir pantalla
   ✓ Salir de llamada
   ✓ Verificar limpieza de recursos
   ```

### Casos de Prueba Automatizados (Futuros)
```bash
# JUnit para backend
mvn test

# Jest para frontend
npm test
```

---

## 🔄 Versionamiento

### v1.0.0 (Actual)
- ✅ Sistema de autenticación
- ✅ Registro de usuarios
- ✅ Chat en tiempo real
- ✅ Transferencia de archivos
- ✅ Videollamadas grupales
- ✅ Interfaz responsive
- ✅ Arquitectura modular con patrones de diseño

### Roadmap v1.1.0
- ⏳ Historial de mensajes persistente
- ⏳ Notificaciones de escritura ("usuario está escribiendo...")
- ⏳ Emojis y reacciones
- ⏳ Rooms/Canales privados
- ⏳ Estado de usuario (online/offline/away)

### Roadmap v2.0.0
- ⏳ Cifrado end-to-end
- ⏳ Videollamadas 1-a-1 (SFU)
- ⏳ Grabación de llamadas
- ⏳ Búsqueda de mensajes
- ⏳ App móvil nativa
- ⏳ API REST pública

---

## 👥 Contribuciones

### Equipo de Desarrollo
- **Jose Rojas** 
- **Isabel Ávila**
- **Mauricio Chinchayhura**
- **Frabicio Zúñiga** 

### Contribuir al Proyecto

1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Guía de Estilo

#### Java
- Seguir convenciones de Oracle
- JavaDoc para métodos públicos
- Nombres descriptivos en camelCase

#### JavaScript
- ESLint configuración estándar
- JSDoc para funciones públicas
- Arrow functions donde sea apropiado
- Const/let (no var)

---

## 📄 Licencia

Este proyecto es desarrollado con fines académicos para el curso de Lenguaje de Programación 2.

**Uso Educativo Únicamente** - No apto para producción sin mejoras de seguridad.

---

## 📚 Referencias y Recursos

### Documentación Oficial
- [Java WebSocket API](https://docs.oracle.com/javaee/7/api/javax/websocket/package-summary.html)
- [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MySQL Documentation](https://dev.mysql.com/doc/)

### Librerías Utilizadas
- [Java-WebSocket](https://github.com/TooTallNate/Java-WebSocket)
- [Gson](https://github.com/google/gson)
- [MySQL Connector/J](https://dev.mysql.com/downloads/connector/j/)

### Tutoriales y Guías
- [WebRTC for Beginners](https://webrtc.org/getting-started/overview)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Design Patterns in Java](https://refactoring.guru/design-patterns/java)

---

## 📞 Contacto y Soporte

### Issues
Para reportar bugs o solicitar features, usar el sistema de Issues de GitHub:
- 🐛 Bug Report
- ✨ Feature Request
- 📖 Documentation

### FAQ

**P: ¿Puedo usar esto en producción?**  
R: No recomendado sin implementar las mejoras de seguridad listadas.

**P: ¿Soporta múltiples salas de chat?**  
R: Actualmente no, todos los usuarios están en una sala global.

**P: ¿Cuál es el límite de usuarios en videollamada?**  
R: Recomendado máximo 5-6 por limitaciones de mesh topology.

**P: ¿Los mensajes se guardan en BD?**  
R: Actualmente no, solo los usuarios. Roadmap para v1.1.0.

**P: ¿Funciona en móviles?**  
R: Sí, la interfaz es responsive y WebRTC funciona en navegadores móviles.

---

## 🎓 Créditos Académicos

**Curso**: Lenguaje de Programación 2  
**Institución**: Universidad Nacional de Ingeniería  
**Profesor**: YAN EDUARDO CISNEROS NAPRAVNIK
**Ciclo Académico**: 2025-II  
**Proyecto**: PC3 - Sistema de Chat en Tiempo Real

---

## 🌟 Agradecimientos

Agradecimientos especiales a:
- Comunidad de Stack Overflow
- Documentación de MDN Web Docs
- Java-WebSocket contributors
- Google STUN servers
- VS Code y extensiones utilizadas
- Wei por ser el tester

---

**Última actualización**: 14 de Noviembre, 2025  
**Versión**: 2.0.0  
**Estado**: ✅ Estable - Funcional para desarrollo
