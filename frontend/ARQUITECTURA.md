# Arquitectura NextChat - Frontend Modular

## Descripción General
Refactorización completa del código del cliente para implementar una arquitectura escalable basada en patrones de diseño profesionales.

## Estructura de Archivos

```
frontend/
├── app.js                          # Punto de entrada - Orquestador principal
├── index.html                      # HTML con <script type="module">
├── styles.css                      # Estilos de la aplicación
└── js/
    ├── ChatApplication.js          # Facade principal - Coordina todos los módulos
    ├── handlers/
    │   └── MessageHandler.js       # Strategy Pattern - Procesa mensajes del servidor
    ├── managers/
    │   ├── WebSocketManager.js     # Singleton - Gestión de conexión WebSocket
    │   ├── UIManager.js            # Singleton - Gestión de interfaz de usuario
    │   ├── FileManager.js          # Singleton - Gestión de archivos
    │   └── VideoCallManager.js     # Singleton - Gestión de videollamadas WebRTC
    └── utils/
        ├── DOMUtils.js             # Utilidades para manipulación del DOM
        └── FileUtils.js            # Utilidades para procesamiento de archivos
```

## Patrones de Diseño Implementados

### 1. **Singleton Pattern**
**Aplicado en:** WebSocketManager, UIManager, FileManager, VideoCallManager

**Propósito:** Garantizar una única instancia de cada manager en toda la aplicación.

**Implementación:**
```javascript
class WebSocketManager {
  static instance = null;

  constructor() {
    if (WebSocketManager.instance) {
      return WebSocketManager.instance;
    }
    // ... inicialización
    WebSocketManager.instance = this;
  }

  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
}
```

**Beneficios:**
- Estado global consistente
- Control de recursos (1 conexión WebSocket)
- Acceso centralizado desde cualquier módulo

### 2. **Observer Pattern**
**Aplicado en:** WebSocketManager

**Propósito:** Notificar eventos de WebSocket a múltiples listeners de forma desacoplada.

**Implementación:**
```javascript
class WebSocketManager {
  constructor() {
    this.listeners = new Map(); // {eventName: [callbacks]}
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }
}
```

**Eventos:**
- `open`: Conexión establecida
- `message`: Mensaje JSON recibido
- `binary`: Mensaje binario recibido
- `close`: Conexión cerrada
- `error`: Error de conexión

**Beneficios:**
- Desacoplamiento entre emisor y receptores
- Fácil extensión con nuevos listeners
- Comunicación asíncrona entre módulos

### 3. **Strategy Pattern**
**Aplicado en:** MessageHandler

**Propósito:** Procesar diferentes tipos de mensajes con estrategias específicas.

**Implementación:**
```javascript
class MessageHandler {
  constructor() {
    this.strategies = new Map([
      ['auth_ok', this.handleAuthOk.bind(this)],
      ['auth_fail', this.handleAuthFail.bind(this)],
      ['text', this.handleTextMessage.bind(this)],
      ['file', this.handleFileMessage.bind(this)],
      ['webrtc_offer', this.handleWebRTCOffer.bind(this)],
      // ... más estrategias
    ]);
  }

  handleMessage(message) {
    const strategy = this.strategies.get(message.type);
    if (strategy) {
      strategy(message);
    }
  }
}
```

**Beneficios:**
- Fácil agregar nuevos tipos de mensajes
- Código organizado y mantenible
- Cumple principio Open/Closed (SOLID)

### 4. **Facade Pattern**
**Aplicado en:** ChatApplication

**Propósito:** Proporcionar una interfaz simplificada para coordinar todos los módulos complejos.

**Implementación:**
```javascript
class ChatApplication {
  constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.uiManager = UIManager.getInstance();
    this.fileManager = FileManager.getInstance();
    this.videoCallManager = VideoCallManager.getInstance();
    this.messageHandler = new MessageHandler();
  }

  init() {
    this.setupWebSocketListeners();
    this.setupUIListeners();
  }

  handleLogin() {
    // Coordina múltiples managers
    await this.wsManager.connect();
    this.wsManager.authenticate(username, password);
  }
}
```

**Beneficios:**
- Oculta complejidad interna
- Punto de entrada único y claro
- Fácil mantenimiento y testing

## Módulos Detallados

### **WebSocketManager** (Singleton + Observer)
**Responsabilidades:**
- Establecer y mantener conexión WebSocket
- Enviar mensajes JSON/binarios al servidor
- Recibir y emitir eventos de mensajes
- Gestionar estado de conexión

**API Pública:**
- `connect(): Promise<void>` - Conecta al servidor
- `send(data: Object): boolean` - Envía mensaje JSON
- `sendBinary(data: ArrayBuffer): boolean` - Envía datos binarios
- `close(): void` - Cierra conexión
- `on(event: string, callback: Function): void` - Registra listener
- `off(event: string, callback: Function): void` - Elimina listener
- `authenticate(username, password): boolean` - Envía autenticación
- `logout(): void` - Cierra sesión

### **UIManager** (Singleton)
**Responsabilidades:**
- Gestionar secciones de UI (login, chat)
- Renderizar mensajes de texto y archivos
- Actualizar lista de usuarios conectados
- Gestionar inputs y formularios

**API Pública:**
- `showChatScreen(username): void` - Muestra pantalla de chat
- `showLoginScreen(): void` - Muestra pantalla de login
- `showLoginError(message): void` - Muestra error de login
- `renderTextMessage(from, content, timestamp, isMine): void` - Renderiza mensaje
- `renderFileMessage(url, filename, from, isMine, timestamp): void` - Renderiza archivo
- `renderSystemMessage(message): void` - Renderiza mensaje del sistema
- `renderUserList(users: Array<string>): void` - Actualiza lista de usuarios
- `getCurrentUser(): string` - Obtiene usuario actual

### **FileManager** (Singleton)
**Responsabilidades:**
- Enviar archivos al servidor (Base64)
- Recibir archivos remotos
- Conversión entre ArrayBuffer y Base64
- Renderizar archivos en el chat

**API Pública:**
- `sendFile(file: File): Promise<void>` - Envía archivo
- `receiveFile(from, filename, mimetype, base64Data, timestamp): void` - Recibe archivo
- `renderFile(url, filename, from, isMine, timestamp): void` - Renderiza archivo

### **VideoCallManager** (Singleton)
**Responsabilidades:**
- Gestionar videollamadas grupales WebRTC
- Crear y mantener peer connections (mesh topology)
- Manejar streams de audio/video
- Controlar cámara, micrófono, compartir pantalla
- Gestionar UI de videollamada (grid, lista de participantes)

**API Pública:**
- `toggleCall(): Promise<void>` - Toggle unirse/salir
- `joinCall(currentUser): Promise<boolean>` - Une a videollamada
- `leaveCall(): void` - Sale de videollamada
- `handleRoomUsers(users: Array<string>): Promise<void>` - Procesa lista de usuarios en sala
- `handleUserJoined(username): void` - Procesa nuevo usuario
- `handleUserLeft(username): void` - Procesa usuario que salió
- `handleOffer(from, offer): Promise<void>` - Procesa oferta WebRTC
- `handleAnswer(from, answer): Promise<void>` - Procesa respuesta WebRTC
- `handleIceCandidate(from, candidate): Promise<void>` - Procesa ICE candidate
- `toggleMicrophone(): void` - Toggle mute/unmute
- `toggleCamera(): void` - Toggle cámara on/off
- `shareScreen(): Promise<void>` - Comparte pantalla

### **MessageHandler** (Strategy)
**Responsabilidades:**
- Procesar mensajes del servidor
- Delegar a managers apropiados según tipo de mensaje
- Implementar estrategias específicas por tipo

**Tipos de Mensajes Manejados:**
- `auth_ok`: Autenticación exitosa
- `auth_fail`: Autenticación fallida
- `userlist`: Lista de usuarios conectados
- `text`: Mensaje de texto
- `file`: Mensaje de archivo
- `error`: Mensaje de error
- `room_users`: Lista de usuarios en videollamada
- `user_joined`: Usuario se unió a videollamada
- `user_left`: Usuario salió de videollamada
- `webrtc_offer`: Oferta WebRTC
- `webrtc_answer`: Respuesta WebRTC
- `webrtc_ice`: ICE candidate

### **DOMUtils**
**Responsabilidades:**
- Selección de elementos DOM
- Formateo de timestamps
- Escapado de HTML/atributos
- Generación de SVG de avatares

**API Pública:**
- `$(selector): Element` - Selecciona un elemento
- `$$(selector): NodeList` - Selecciona múltiples elementos
- `escapeHtml(str): string` - Escapa HTML
- `escapeAttribute(str): string` - Escapa atributos
- `formatTime(timestamp): string` - Formatea hora
- `getAvatarSVG(): string` - Genera SVG de avatar

### **FileUtils**
**Responsabilidades:**
- Conversión ArrayBuffer ↔ Base64
- Obtener emoji por extensión de archivo
- Crear Blobs con tipo MIME
- Extraer extensión de archivos

**API Pública:**
- `arrayBufferToBase64(buffer): string` - Convierte a Base64
- `base64ToArrayBuffer(base64): ArrayBuffer` - Convierte a ArrayBuffer
- `getEmojiByExtension(extension): string` - Obtiene emoji (🖼️📄📊💻🎵🎬)
- `getExtension(filename): string` - Extrae extensión
- `base64ToBlob(base64, mimeType): Blob` - Crea Blob
- `createObjectURL(blob): string` - Crea URL de objeto

### **ChatApplication** (Facade)
**Responsabilidades:**
- Inicializar todos los módulos
- Coordinar flujo de eventos
- Conectar listeners de WebSocket con handlers
- Conectar listeners de UI con acciones

**Flujo de Inicialización:**
1. Constructor: Instanciar todos los managers (Singletons)
2. `init()`: Configurar listeners de WebSocket y UI
3. Registrar evento `message` → `MessageHandler.handleMessage()`
4. Registrar eventos de botones → métodos handler

## Principios SOLID Aplicados

### **Single Responsibility Principle (SRP)**
Cada clase tiene una única responsabilidad:
- `WebSocketManager`: Solo comunicación WebSocket
- `UIManager`: Solo manipulación de UI
- `FileManager`: Solo gestión de archivos
- `VideoCallManager`: Solo videollamadas
- `MessageHandler`: Solo procesamiento de mensajes

### **Open/Closed Principle (OCP)**
Abierto a extensión, cerrado a modificación:
- `MessageHandler`: Agregar nuevos tipos de mensajes sin modificar código existente
- `FileUtils.getEmojiByExtension()`: Agregar nuevas extensiones en el map

### **Liskov Substitution Principle (LSP)**
No aplica directamente (no hay herencia de clases), pero se respeta en interfaces consistentes.

### **Interface Segregation Principle (ISP)**
Cada manager expone solo métodos relevantes a su dominio:
- `FileManager` no expone métodos de UI
- `UIManager` no expone métodos de WebSocket

### **Dependency Inversion Principle (DIP)**
Módulos de alto nivel (`ChatApplication`) dependen de abstracciones (managers), no de implementaciones concretas.

## Flujo de Datos

### **Login:**
```
Usuario → UI (btnLogin.click)
  → ChatApplication.handleLogin()
    → WebSocketManager.connect()
    → WebSocketManager.authenticate(username, password)
      → Servidor recibe {type: 'auth', username, password}
        → Servidor responde {type: 'auth_ok', username}
          → WebSocketManager emite evento 'message'
            → MessageHandler.handleMessage()
              → MessageHandler.handleAuthOk()
                → UIManager.showChatScreen(username)
```

### **Enviar Mensaje:**
```
Usuario → UI (txtInput + Enter)
  → ChatApplication.handleSendMessage()
    → UIManager.getTextInputValue()
    → WebSocketManager.send({type: 'text', content})
      → Servidor broadcast a todos
        → WebSocketManager emite evento 'message'
          → MessageHandler.handleTextMessage()
            → UIManager.renderTextMessage(from, content, timestamp, isMine)
```

### **Enviar Archivo:**
```
Usuario → UI (fileInput.change)
  → ChatApplication.handleSelectFile(file)
    → FileManager.sendFile(file)
      → FileUtils.arrayBufferToBase64(buffer)
      → WebSocketManager.send({type: 'file', filename, mimetype, size, data})
      → FileManager.renderFile(url, filename, currentUser, true)
        → UIManager.renderFileMessage(...)
```

### **Videollamada - Unirse:**
```
Usuario → UI (btnJoinCall.click)
  → ChatApplication.handleToggleVideoCall()
    → VideoCallManager.joinCall(currentUser)
      → navigator.mediaDevices.getUserMedia({video, audio})
      → VideoCallManager.addLocalVideo(currentUser)
      → WebSocketManager.send({type: 'join_room'})
        → Servidor responde {type: 'room_users', users: [...]}
          → MessageHandler.handleRoomUsers(users)
            → VideoCallManager.handleRoomUsers(users)
              → Para cada usuario: VideoCallManager.createPeerConnection(user, true)
                → RTCPeerConnection.createOffer()
                → WebSocketManager.send({type: 'webrtc_offer', to, offer})
```

## Ventajas de la Arquitectura

### **Mantenibilidad**
- Código organizado en módulos pequeños y cohesivos
- Fácil localizar y corregir bugs
- Cada clase tiene < 300 líneas

### **Escalabilidad**
- Agregar nuevos tipos de mensajes: solo modificar `MessageHandler`
- Agregar nuevas funcionalidades: crear nuevo manager
- Extender UI: solo modificar `UIManager`

### **Testabilidad**
- Cada módulo puede testearse de forma aislada
- Singletons facilitan mocking
- Métodos públicos claramente definidos

### **Reusabilidad**
- `DOMUtils` y `FileUtils` son reutilizables en otros proyectos
- Managers pueden usarse en diferentes contextos
- Patrón Observer permite múltiples listeners

### **Extensibilidad**
- Agregar autenticación OAuth: solo modificar `WebSocketManager.authenticate()`
- Agregar notificaciones push: crear listener en `WebSocketManager.on('message')`
- Agregar persistencia: crear `StorageManager` Singleton

## Comparación: Antes vs. Después

### **Antes (app.js monolítico)**
- 1 archivo, ~1000 líneas
- Variables globales (`ws`, `yo`, `inCall`, `peerConnections`)
- Funciones dispersas sin organización clara
- Difícil testing y debugging
- Alto acoplamiento entre componentes

### **Después (arquitectura modular)**
- 9 archivos, ~150-300 líneas cada uno
- Sin variables globales (estado en Singletons)
- Responsabilidades claras por módulo
- Fácil testing con mocks
- Bajo acoplamiento, alta cohesión

## Ejemplo de Uso

```javascript
// app.js - Punto de entrada
import ChatApplication from './js/ChatApplication.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new ChatApplication();
  app.init();
});
```

## Patrones Adicionales Considerados

### **Command Pattern** (No implementado)
Podría usarse para implementar undo/redo de mensajes.

### **Factory Pattern** (No implementado)
Podría usarse para crear diferentes tipos de mensajes.

### **Mediator Pattern** (Parcialmente implementado)
`ChatApplication` actúa como mediador entre managers.

## Mejoras Futuras

1. **Agregar TypeScript** para type safety
2. **Implementar pruebas unitarias** con Jest
3. **Agregar logging centralizado** con niveles (debug, info, error)
4. **Implementar State Pattern** para estados de conexión
5. **Agregar Repository Pattern** para persistencia local (LocalStorage)
6. **Implementar Circuit Breaker** para reintentos de conexión

## Conclusión

Esta refactorización transforma el código de un script monolítico en una arquitectura profesional, escalable y mantenible, aplicando patrones de diseño reconocidos de la industria y siguiendo principios SOLID.
