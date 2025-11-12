# NextChat - Frontend Refactorizado

## 📋 Resumen de Cambios

El código del frontend ha sido completamente refactorizado de un archivo monolítico (`app.js` con ~1000 líneas) a una **arquitectura modular profesional** con patrones de diseño.

## 🏗️ Nueva Estructura

```
frontend/frontend/
├── index.html                      # HTML principal (sin cambios funcionales)
├── styles.css                      # Estilos CSS (sin cambios)
├── app.js                          # ⭐ Punto de entrada (10 líneas)
├── ARQUITECTURA.md                 # Documentación técnica completa
├── DIAGRAMA.txt                    # Diagramas visuales y flujos
└── js/
    ├── ChatApplication.js          # Orquestador principal (Facade)
    ├── handlers/
    │   └── MessageHandler.js       # Procesador de mensajes (Strategy)
    ├── managers/
    │   ├── WebSocketManager.js     # Gestión de WebSocket (Singleton + Observer)
    │   ├── UIManager.js            # Gestión de UI (Singleton)
    │   ├── FileManager.js          # Gestión de archivos (Singleton)
    │   └── VideoCallManager.js     # Gestión de videollamadas (Singleton)
    └── utils/
        ├── DOMUtils.js             # Utilidades DOM
        └── FileUtils.js            # Utilidades de archivos
```

## 🎯 Patrones de Diseño Implementados

### 1. **Singleton Pattern**
- `WebSocketManager`, `UIManager`, `FileManager`, `VideoCallManager`
- Garantiza una única instancia de cada manager
- Estado global consistente

### 2. **Observer Pattern**
- `WebSocketManager` con sistema de eventos (`on`, `emit`)
- Desacopla emisores de receptores
- Permite múltiples listeners por evento

### 3. **Strategy Pattern**
- `MessageHandler` con estrategias por tipo de mensaje
- Fácil agregar nuevos tipos sin modificar código existente
- Cumple principio Open/Closed

### 4. **Facade Pattern**
- `ChatApplication` coordina todos los módulos
- Interfaz simplificada para inicialización
- Oculta complejidad interna

## 🚀 Cómo Ejecutar

### 1. Iniciar Servidor Backend
```powershell
cd C:\Users\jose\Desktop\PC3
mvn clean compile exec:java -Dexec.mainClass="server.MainServer"
```

### 2. Abrir Frontend
```powershell
cd C:\Users\jose\Desktop\PC3\frontend\frontend
# Opción 1: Live Server en VS Code
# Click derecho en index.html → Open with Live Server

# Opción 2: Python HTTP Server
python -m http.server 5500

# Opción 3: Node.js HTTP Server
npx http-server -p 5500
```

### 3. Acceder en Navegador
```
http://localhost:5500
```

## ✅ Funcionalidades (Sin Cambios)

Todas las funcionalidades existentes siguen funcionando exactamente igual:

- ✅ Login con usuario/contraseña
- ✅ Envío/recepción de mensajes de texto
- ✅ Envío/recepción de archivos (Base64 con formato preservado)
- ✅ Lista de usuarios conectados
- ✅ Videollamadas grupales con WebRTC
- ✅ Controles de micrófono, cámara, compartir pantalla
- ✅ Grid adaptativo de videos (1-9+ participantes)

## 📖 Documentación Técnica

### Documentos Disponibles

1. **`ARQUITECTURA.md`**: Documentación completa
   - Descripción de cada módulo
   - API pública de cada clase
   - Flujo de datos detallado
   - Comparación antes/después
   - Principios SOLID aplicados

2. **`DIAGRAMA.txt`**: Diagramas visuales
   - Arquitectura completa
   - Flujo de login
   - Flujo de videollamada
   - Patrones de diseño ilustrados

### APIs Principales

#### WebSocketManager
```javascript
const wsManager = WebSocketManager.getInstance();
await wsManager.connect();
wsManager.send({ type: 'text', content: 'Hola' });
wsManager.on('message', (data) => console.log(data));
```

#### UIManager
```javascript
const uiManager = UIManager.getInstance();
uiManager.renderTextMessage('Usuario', 'Mensaje', Date.now(), false);
uiManager.renderSystemMessage('Conexión establecida');
```

#### FileManager
```javascript
const fileManager = FileManager.getInstance();
await fileManager.sendFile(file);
```

#### VideoCallManager
```javascript
const videoManager = VideoCallManager.getInstance();
await videoManager.joinCall('username');
videoManager.toggleMicrophone();
videoManager.toggleCamera();
```

## 🔧 Desarrollo y Extensión

### Agregar Nuevo Tipo de Mensaje

**Antes** (código monolítico):
- Buscar `function manejarJson()`
- Agregar nuevo `case` en el `switch`
- Implementar lógica mezclada con otras funciones

**Ahora** (arquitectura modular):
```javascript
// En MessageHandler.js
constructor() {
  this.strategies = new Map([
    // ... estrategias existentes
    ['nuevo_tipo', this.handleNuevoTipo.bind(this)]
  ]);
}

handleNuevoTipo(message) {
  // Implementación aislada
  this.uiManager.renderSystemMessage(message.content);
}
```

### Agregar Nuevo Manager

```javascript
// js/managers/NotificationManager.js
class NotificationManager {
  static instance = null;

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // ... métodos
}

// En ChatApplication.js
constructor() {
  // ... otros managers
  this.notificationManager = NotificationManager.getInstance();
}
```

## 🧪 Testing

La nueva arquitectura facilita el testing unitario:

```javascript
// Ejemplo: Test de FileUtils
import FileUtils from './js/utils/FileUtils.js';

describe('FileUtils', () => {
  test('getEmojiByExtension returns correct emoji', () => {
    expect(FileUtils.getEmojiByExtension('PDF')).toBe('📄');
    expect(FileUtils.getEmojiByExtension('JPG')).toBe('🖼️');
    expect(FileUtils.getEmojiByExtension('MP3')).toBe('🎵');
  });
});
```

## 🎓 Principios SOLID

### [S] Single Responsibility
Cada clase tiene una única razón para cambiar:
- `WebSocketManager`: Solo comunicación
- `UIManager`: Solo UI
- `FileManager`: Solo archivos

### [O] Open/Closed
Abierto a extensión, cerrado a modificación:
- Agregar mensajes: extender `MessageHandler.strategies`
- Agregar extensiones: modificar `FileUtils.emojiMap`

### [L] Liskov Substitution
Interfaces consistentes en todos los managers.

### [I] Interface Segregation
Cada manager expone solo métodos relevantes.

### [D] Dependency Inversion
Alto nivel depende de abstracciones, no de implementaciones.

## 📊 Comparación: Antes vs. Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Archivos** | 1 monolítico | 9 modulares |
| **Líneas/archivo** | ~1000 | ~80-350 |
| **Variables globales** | ❌ Muchas | ✅ Ninguna |
| **Patrones de diseño** | ❌ Ninguno | ✅ 4 patrones |
| **Testabilidad** | ❌ Difícil | ✅ Fácil |
| **Extensibilidad** | ❌ Complejo | ✅ Simple |
| **Mantenibilidad** | ❌ Baja | ✅ Alta |
| **Reusabilidad** | ❌ Nula | ✅ Alta |

## 🐛 Debugging

### Ver Logs por Módulo

Abre la consola del navegador (F12):

```javascript
// Logs de WebSocket
// En WebSocketManager: console.log('WS conectado')

// Logs de mensajes
// En MessageHandler: console.log('Tipo de mensaje:', message.type)

// Logs de videollamada
// En VideoCallManager: console.log('Creando peer con:', username)
```

### Verificar Estado de Managers

```javascript
// En consola del navegador
const wsManager = WebSocketManager.getInstance();
console.log('Conectado:', wsManager.connected());

const uiManager = UIManager.getInstance();
console.log('Usuario actual:', uiManager.getCurrentUser());
```

## ⚠️ Notas Importantes

### ES Modules
El código ahora usa **ES Modules** (ESM):
- `index.html` tiene `<script type="module" src="app.js">`
- Todos los archivos usan `import`/`export`
- **Requiere servidor HTTP** (no funciona con `file://`)

### Compatibilidad
- ✅ Chrome 61+
- ✅ Firefox 60+
- ✅ Safari 10.1+
- ✅ Edge 16+

### Servidor HTTP Requerido
Los módulos ES6 **no funcionan** con protocolo `file://`. Usa:
- Live Server (VS Code)
- Python: `python -m http.server 5500`
- Node: `npx http-server -p 5500`

## 🚀 Próximos Pasos Sugeridos

1. **TypeScript**: Agregar tipado estático
2. **Testing**: Implementar Jest para pruebas unitarias
3. **Build Tool**: Agregar Webpack/Vite para bundling
4. **Linting**: ESLint + Prettier para código consistente
5. **CI/CD**: Pipeline automatizado
6. **State Management**: Considerar Redux/MobX si crece

## 📞 Soporte

Para dudas sobre la arquitectura, consultar:
- `ARQUITECTURA.md`: Documentación técnica completa
- `DIAGRAMA.txt`: Diagramas visuales y flujos
- Comentarios JSDoc en cada archivo

## ✨ Beneficios Clave

1. **Mantenibilidad**: Código organizado, fácil de entender y modificar
2. **Escalabilidad**: Agregar features sin romper código existente
3. **Testabilidad**: Cada módulo testeable de forma aislada
4. **Profesionalismo**: Patrones de diseño reconocidos en la industria
5. **Reutilización**: Utilidades compartibles en otros proyectos
6. **Colaboración**: Estructura clara para trabajo en equipo

---

**Refactorización completada por:** GitHub Copilot  
**Fecha:** Noviembre 2025  
**Objetivo:** Transformar código monolítico en arquitectura profesional escalable
