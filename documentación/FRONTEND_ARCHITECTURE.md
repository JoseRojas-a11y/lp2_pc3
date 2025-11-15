# NextTalk — Arquitectura de Frontend (v2)

Este documento describe desde cero la arquitectura actual del frontend de NextTalk. Refleja la estructura real del proyecto, los patrones aplicados, responsabilidades de cada módulo, configuración, protocolo de mensajes y el flujo WebRTC.

---

## Visión General

- Aplicación web modular sin frameworks (ES6 modules).
- Patrones: Facade, Singleton, Observer, Strategy.
- Comunicación con el backend por WebSocket; señalización WebRTC para videollamadas.
- CSS modular por capas (base, layout, components, features, utilities, responsive).

---

## Estructura de Archivos (Frontend)

```
frontend/
├── index.html
├── app.js                          # Entrada (ES Modules)
├── chatDetails/
│   ├── config.js                   # Config FE: cálculo de wsUrl (ws/wss)
│   ├── ChatApplication.js          # Facade: orquestra managers y handlers
│   ├── handlers/
│   │   └── MessageHandler.js       # Strategy: procesa mensajes entrantes
│   ├── managers/
│   │   ├── WebSocketManager.js     # Singleton + Observer (conexión WS)
│   │   ├── UIManager.js            # Singleton (render UI / estados de vista)
│   │   ├── FileManager.js          # Singleton (envío/recepción de archivos)
│   │   └── VideoCallManager.js     # Singleton (WebRTC + UI de video)
│   └── utils/
│       ├── DOMUtils.js             # Selectores, escape, formato, helpers DOM
│       └── FileUtils.js            # ArrayBuffer↔Base64, Blob, extensión
└── styles/
    ├── _variables.css
    ├── _base.css
    ├── layout/
    │   └── chat-layout.css
    ├── components/
    │   ├── messages.css
    │   └── files.css
    ├── features/
    │   ├── auth.css
    │   └── video-call.css
    ├── utilities.css
    └── responsive.css
```

Notas
- `index.html` carga `app.js` con `<script type="module">` y los CSS por múltiples `<link>` (carga paralela).
- La URL del WebSocket se construye en `chatDetails/config.js` y se usa desde `WebSocketManager`.

---

## Patrones de Diseño (Mapa)

- Facade: `ChatApplication` coordina UI, WebSocket, archivos y videollamada.
- Singleton: `WebSocketManager`, `UIManager`, `FileManager`, `VideoCallManager`.
- Observer: `WebSocketManager` emite `open`, `message`, `close`, `error`; suscriptores manejan UI y flujos.
- Strategy: `MessageHandler` despacha según `message.type` (auth_ok, userlist, text, file, room_users, user_joined, user_left, webrtc_*).

---

## Módulos y APIs

### ChatApplication (Facade)
- Responsabilidad: punto de entrada y orquestación de managers + wiring de eventos.
- Funciones clave: `init()`, `handleLogin()`, `handleRegister()`, `sendText()`, `sendFile()`, `joinCall()`, `leaveCall()`, `logout()`.
- Interacciones: suscribe listeners a `WebSocketManager`, delega a `UIManager`, `FileManager`, `VideoCallManager`.

### WebSocketManager (Singleton + Observer)
- Responsabilidad: ciclo de vida WS, envío/recepción de mensajes.
- API:
  - `connect(): Promise<void>`
  - `send(obj: object): boolean`
  - `on(event: 'open'|'message'|'close'|'error', cb)` / `off(event, cb)`
  - `authenticate(username, password)`
  - `register(username, fullName, password)`
  - `logout()`
- Detalles: usa `CONFIG.wsUrl` desde `config.js`; emite eventos a `ChatApplication`/`MessageHandler`.

### UIManager (Singleton)
- Responsabilidad: gestión de vistas y render de elementos UI.
- API: `showLoginScreen()`, `showRegisterScreen()`, `showChatScreen(username)`, `renderTextMessage(from, content, ts, isMine)`, `renderFileMessage(from, filename, mimetype, base64, ts, isMine)`, `renderUserList(users)`.

### FileManager (Singleton)
- Responsabilidad: codificación/decodificación y envío de archivos.
- API: `sendFile(file: File)`, `receiveFile(from, filename, mimetype, base64, ts)`.
- Flujo: lee `File` → `ArrayBuffer` → Base64 (`FileUtils`) → envía `{type:'file', ...}` por WS.

### VideoCallManager (Singleton)
- Responsabilidad: WebRTC y UI de videollamada (mesh topology).
- API: `joinCall()`, `leaveCall()`, `toggleMicrophone()`, `toggleCamera()`, `shareScreen()`, `toggleMaximize()`.
- Señalización por WS: `join_room`, `leave_room`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice`.
- Comportamiento UI: ventana flotante, modo reducido y maximizado.

### MessageHandler (Strategy)
- Responsabilidad: procesar mensajes del servidor y delegar a managers.
- Entradas típicas: `auth_ok`, `register_ok`, `auth_fail`, `register_fail`, `userlist`, `text`, `file`, `room_users`, `user_joined`, `user_left`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice`, `error`.

### Utils
- `DOMUtils`: selectores seguros, escape HTML/atributos, formato de hora.
- `FileUtils`: `arrayBufferToBase64`, `base64ToArrayBuffer`, blob URL, extensión/emoji.

---

## Configuración (config.js)

- Calcula `wsUrl` dinámicamente:
  - Protocolo: `ws`/`wss` según `location.protocol`.
  - Host/puerto por defecto: `location.hostname` y puerto configurable.
  - Overrides en tiempo de ejecución con `localStorage`:
    ```js
    localStorage.setItem('WS_HOST', '192.168.1.50');
    localStorage.setItem('WS_PORT', '8081');
    location.reload();
    ```
- Consumido por `WebSocketManager` al conectarse.

---

## Protocolo de Mensajes (Cliente → Servidor)

- Autenticación: `{ type: 'auth', username, password }`
- Registro: `{ type: 'register', username, fullName, password }`
- Texto: `{ type: 'text', content }`
- Archivo: `{ type: 'file', filename, mimetype, size, data }` (data en Base64)
- Videollamada: `{ type: 'join_room' }`, `{ type: 'leave_room' }`
- WebRTC: `{ type: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice', ... }`
- Logout: `{ type: 'logout' }`

Respuestas servidor → cliente típicas:
- `auth_ok` / `auth_fail`, `register_ok` / `register_fail`
- `userlist`
- `text` (broadcast)
- `file` (broadcast, excluye remitente)
- `room_users`, `user_joined`, `user_left`
- `webrtc_offer`, `webrtc_answer`, `webrtc_ice`
- `error`

---

## WebRTC (Frontend)

- Topología: mesh (cada par de usuarios crea una conexión P2P). Máximo recomendado 5–6 participantes.
- Media: `getUserMedia` para cámara/mic; opción de `getDisplayMedia` para compartir pantalla.
- Señalización:
  1) `join_room` para anunciar presencia y recibir `room_users`.
  2) Ofertas (`webrtc_offer`) del que inicia hacia cada peer.
  3) Respuestas (`webrtc_answer`) del receptor.
  4) Intercambio de candidatos (`webrtc_ice`) hasta establecer conectividad.
- UI de Video:
  - Ventana flotante, arrastrable.
  - Modo reducido: foco en participante prioritario.
  - Modo maximizado: grilla de participantes con controles.

---

## CSS Modular

- Capas por propósito:
  - `_variables.css`: tokens de diseño.
  - `_base.css`: resets/base.
  - `layout/chat-layout.css`: disposición general.
  - `components/*.css`: piezas reutilizables (mensajes, archivos, composer).
  - `features/*.css`: pantallas/funcionalidades (auth, video-call).
  - `utilities.css`: utilidades (helpers atómicos).
  - `responsive.css`: ajustes por breakpoint.
- Carga: múltiples `<link>` en `index.html` para paralelizar y controlar orden.

---

## Ejecución Rápida (Solo Frontend)

```powershell
# Opción A: Live Server (VS Code)
# Click derecho en frontend/index.html → Open with Live Server

# Opción B: Servidor HTTP simple
cd C:\Users\jose\Desktop\PC3\frontend
python -m http.server 5500
```

Nota: El backend debe estar corriendo y accesible por WebSocket en la URL configurada.

---

## Extensibilidad (Nuevos Tipos de Mensaje)

1) Agregar estrategia en `MessageHandler` para el nuevo `message.type`.
2) Exponer métodos desde `ChatApplication` si se necesita interacción con UI/gestores.
3) Adaptar `UIManager`/`FileManager`/`VideoCallManager` según el dominio.
4) Usar `WebSocketManager.send({ type: 'nuevo_tipo', ... })` para emitir eventos.

---

## Testing y Depuración

- Propuesto: Jest para unit tests de utilidades y handlers de mensajes.
- Validar WebRTC en `https:` (browsers requieren contexto seguro para cámara/mic en producción).
- Console Logging: habilitar logs de `WebSocketManager` y `VideoCallManager` durante desarrollo.

---

## Solución de Problemas

- WS falla al conectar:
  - Verificar `CONFIG.wsUrl` en `chatDetails/config.js` y valores en `localStorage`.
  - Revisar que el backend esté levantado y el puerto abierto.
- Video sin permisos:
  - Revisar permisos del navegador para cámara/micrófono.
  - Usar `https` para acceder a APIs de media.
- Archivos grandes fallan:
  - Reducir tamaño. Para >10MB, considerar chunking y reensamblado.

---

## Estado y Versionado

- Versión de frontend: 2.0.0
- Esta documentación sustituye versiones anteriores; refleja la estructura `frontend/` vigente.