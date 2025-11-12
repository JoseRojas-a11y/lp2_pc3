# NextTalk - Sistema de Chat en Tiempo Real

![Java](https://img.shields.io/badge/Java-24-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Maven](https://img.shields.io/badge/Maven-Build-red)

## 📋 Descripción del Proyecto

**NextTalk** es una aplicación de mensajería en tiempo real desarrollada como proyecto académico para el curso de Lenguaje de Programación 2. Permite comunicación instantánea mediante texto, transferencia de archivos y videollamadas grupales usando WebRTC.

### Características Principales

- 🔐 **Sistema de autenticación** con base de datos MySQL
- 👤 **Registro de usuarios** integrado
- 💬 **Chat en tiempo real** mediante WebSocket
- 📎 **Transferencia de archivos** con soporte para múltiples formatos
- 📹 **Videollamadas grupales** usando WebRTC (mesh topology)
- 🎨 **Interfaz moderna** responsive con diseño flotante para videollamadas
- 🏗️ **Arquitectura modular** implementando patrones de diseño profesionales

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
- **CSS3** - Estilos modernos con flexbox/grid
- **WebSocket API** - Cliente nativo del navegador
- **WebRTC API** - Comunicación peer-to-peer para video

#### Base de Datos
- **MySQL 8.0** - Almacenamiento de usuarios y datos persistentes

### Patrones de Diseño Implementados

El proyecto implementa los siguientes patrones de diseño:

1. **Singleton Pattern** 
   - `UIManager`, `WebSocketManager`, `FileManager`, `VideoCallManager`
   - Garantiza una única instancia global de cada gestor

2. **Observer Pattern**
   - `WebSocketManager` con sistema de observadores para eventos
   - Notificación automática a componentes suscritos

3. **Strategy Pattern**
   - `MessageHandler` con estrategias para diferentes tipos de mensajes
   - Fácil extensión para nuevos tipos de mensajes

4. **Facade Pattern**
   - `ChatApplication` como orquestador principal
   - Simplifica la interacción entre componentes

5. **DAO Pattern**
   - `UserDAO`, `DBConnection`
   - Abstracción de acceso a datos

---

## 📁 Estructura del Proyecto

```
PC3/
├── src/
│   ├── main/
│   │   └── java/
│   │       ├── client/           # Cliente TCP (legacy)
│   │       │   ├── command/      # Pattern Command para comandos
│   │       │   ├── core/         # Lógica principal del cliente
│   │       │   ├── service/      # Servicios del cliente
│   │       │   └── util/         # Utilidades
│   │       └── server/
│   │           ├── dao/          # Data Access Objects
│   │           │   ├── DBConnection.java
│   │           │   └── UserDAO.java
│   │           ├── model/        # Modelos de dominio
│   │           │   ├── User.java
│   │           │   ├── Message.java
│   │           │   ├── TextMessage.java
│   │           │   └── FileMessage.java
│   │           ├── view/         # Vistas del servidor
│   │           ├── ChatWebSocketServer.java
│   │           ├── ClientHandler.java
│   │           ├── MainServer.java
│   │           └── ServerController.java
│   └── test/
│       └── java/                 # Tests unitarios
├── frontend/
│   └── frontend/
│       ├── js/
│       │   ├── managers/         # Gestores Singleton
│       │   │   ├── UIManager.js
│       │   │   ├── WebSocketManager.js
│       │   │   ├── FileManager.js
│       │   │   └── VideoCallManager.js
│       │   ├── handlers/         # Manejadores de eventos
│       │   │   └── MessageHandler.js
│       │   ├── utils/            # Utilidades
│       │   │   ├── DOMUtils.js
│       │   │   └── FileUtils.js
│       │   └── ChatApplication.js  # Facade principal
│       ├── index.html            # Interfaz principal
│       ├── styles.css            # Estilos
│       └── app.js                # Entry point
├── database/
│   └── create_tables.sql         # Schema de base de datos
├── pom.xml                       # Configuración Maven
├── REGISTRO_USUARIOS.md          # Documentación de registro
└── README.md                     # Este archivo
```

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

Editar `src/main/java/server/dao/DBConnection.java`:

```java
private DBConnection() throws SQLException {
    String url = "jdbc:mysql://localhost:3306/chatapp?useSSL=false&serverTimezone=UTC";
    String user = "root";           // Tu usuario MySQL
    String pass = "tu_contraseña";  // Tu contraseña MySQL
    conn = DriverManager.getConnection(url, user, pass);
}
```

### 3. Compilar y Ejecutar el Servidor

```bash
# Navegar al directorio del proyecto
cd C:\Users\jose\Desktop\PC3

# Compilar el proyecto
mvn clean compile

# Ejecutar el servidor
mvn exec:java -Dexec.mainClass="server.MainServer"
```

El servidor iniciará en:
- **WebSocket**: `ws://localhost:8081/`
- **TCP**: `localhost:5340` (legacy)

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
- Inicia servidor WebSocket en puerto 8081
- Inicia servidor TCP legacy en puerto 5340
- Gestiona conexiones concurrentes con hilos

#### ChatWebSocketServer.java
Servidor WebSocket que maneja:
- **Autenticación**: `{type: "auth", username, password}`
- **Registro**: `{type: "register", username, fullName, password}`
- **Mensajes de texto**: `{type: "text", content}`
- **Archivos**: `{type: "file", filename, data, mimetype}`
- **Videollamadas**: `join_room`, `leave_room`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice`
- **Logout**: `{type: "logout"}`

#### UserDAO.java
Acceso a datos de usuarios:
```java
User authenticate(String username, String password)
User registerUser(String username, String fullName, String password)
```

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
addObserver(callback)              // Suscribir observador
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
```

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
- **José Rojas** - Desarrollo Full Stack

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
**Institución**: [Nombre de la Universidad]  
**Profesor**: [Nombre del Profesor]  
**Ciclo Académico**: 2025-I  
**Proyecto**: PC3 - Sistema de Chat en Tiempo Real

---

## 🌟 Agradecimientos

Agradecimientos especiales a:
- Comunidad de Stack Overflow
- Documentación de MDN Web Docs
- Java-WebSocket contributors
- Google STUN servers
- VS Code y extensiones utilizadas
- Wei papu pepe

---

**Última actualización**: 11 de Noviembre, 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Estable - Funcional para desarrollo
