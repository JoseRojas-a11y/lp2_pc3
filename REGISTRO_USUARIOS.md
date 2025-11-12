# Sistema de Registro de Usuarios - NextTalk

## 📋 Descripción

Se ha implementado un sistema completo de registro de usuarios que permite crear nuevas cuentas directamente desde la interfaz web, almacenando los datos en la base de datos MySQL.

## ✨ Características Implementadas

### Backend (Java)

1. **UserDAO.registerUser()** - Nuevo método en `src/main/java/server/dao/UserDAO.java`
   - Valida que el usuario no exista
   - Inserta el nuevo usuario en la base de datos
   - Retorna el objeto User creado o null si falló

2. **ClientHandler - Soporte REGISTER** - Modificado `src/main/java/server/ClientHandler.java`
   - Ahora acepta comandos "LOGIN" y "REGISTER"
   - Formato: `String[] {"REGISTER", username, password, fullName}`
   - Respuestas: "REGISTER_SUCCESS" o "REGISTER_FAIL"

3. **ChatWebSocketServer - Endpoint register** - Modificado `src/main/java/server/ChatWebSocketServer.java`
   - Nuevo case "register" en el switch de mensajes
   - Procesa: `{type: "register", username, fullName, password}`
   - Responde: `{type: "register_ok"}` o `{type: "register_fail"}`

### Frontend (JavaScript)

1. **Pantalla de Registro** - Nuevo HTML en `index.html`
   - Formulario con campos: Usuario, Nombre Completo, Contraseña, Confirmar Contraseña
   - Links para alternar entre Login y Registro
   - Validaciones en cliente antes de enviar

2. **UIManager** - Actualizaciones en `js/managers/UIManager.js`
   - `showRegisterScreen()` - Muestra pantalla de registro
   - `showRegisterError(msg)` - Muestra errores de registro
   - `showRegisterSuccess(msg)` - Muestra éxito (opcional)

3. **WebSocketManager** - Nuevo método en `js/managers/WebSocketManager.js`
   - `register(username, fullName, password)` - Envía datos de registro al servidor
   - Formato: `{type: "register", username, fullName, password}`

4. **ChatApplication** - Nuevo handler en `js/ChatApplication.js`
   - `handleRegister()` - Procesa el formulario de registro
   - Validaciones: campos vacíos, longitud mínima, confirmación de contraseña
   - Conecta WebSocket y envía datos de registro

5. **MessageHandler** - Nuevos estrategias en `js/handlers/MessageHandler.js`
   - `handleRegisterOk()` - Inicia sesión automáticamente tras registro exitoso
   - `handleRegisterFail()` - Muestra error (usuario ya existe)

### Base de Datos

1. **Script SQL** - `database/create_tables.sql`
   - Crea base de datos `chatapp` si no existe
   - Tabla `users` con campos: id, username, full_name, password_hash, created_at
   - Índices optimizados para búsquedas
   - Usuarios de prueba pre-cargados

## 🚀 Cómo Usar

### 1. Configurar Base de Datos

```bash
# Ejecutar el script SQL en MySQL
mysql -u root -p < database/create_tables.sql
```

O manualmente en MySQL Workbench:
1. Abrir `database/create_tables.sql`
2. Ejecutar todas las queries
3. Verificar que la tabla `users` se creó correctamente

### 2. Iniciar el Servidor

```powershell
cd C:\Users\jose\Desktop\PC3
mvn clean compile exec:java -Dexec.mainClass="server.MainServer"
```

El servidor WebSocket escuchará en `ws://localhost:8081/`

### 3. Iniciar el Frontend

```powershell
# Abrir con Live Server en VS Code
# O servir con un servidor HTTP local
```

Acceder a: `http://localhost:5500/frontend/frontend/index.html`

### 4. Registrar un Usuario

1. En la pantalla de login, hacer clic en **"Regístrate aquí"**
2. Completar el formulario:
   - **Usuario**: Mínimo 3 caracteres, único
   - **Nombre Completo**: Nombre que verán otros usuarios
   - **Contraseña**: Mínimo 4 caracteres
   - **Confirmar Contraseña**: Debe coincidir
3. Hacer clic en **"Crear Cuenta"**
4. Si todo es correcto, se redirige automáticamente al chat

### 5. Alternar entre Login y Registro

- Desde Login → Clic en "Regístrate aquí"
- Desde Registro → Clic en "Inicia sesión"

## 🔒 Validaciones Implementadas

### Cliente (JavaScript)
- ✅ Todos los campos obligatorios
- ✅ Usuario mínimo 3 caracteres
- ✅ Contraseña mínimo 4 caracteres
- ✅ Contraseñas deben coincidir
- ✅ No permite espacios en blanco al inicio/final

### Servidor (Java)
- ✅ Verifica que usuario no exista (UNIQUE constraint)
- ✅ Valida que username y password no estén vacíos
- ✅ Previene inyección SQL con PreparedStatement
- ✅ Manejo de errores con try-catch

### Base de Datos
- ✅ Username UNIQUE (no permite duplicados)
- ✅ NOT NULL en campos críticos
- ✅ Índice en username para búsquedas rápidas

## 📊 Flujo de Registro

```
1. Usuario completa formulario
   ↓
2. ChatApplication.handleRegister() valida datos
   ↓
3. WebSocketManager.register() envía al servidor
   ↓
4. ChatWebSocketServer recibe {type: "register"}
   ↓
5. UserDAO.registerUser() inserta en BD
   ↓
6. Si éxito: {type: "register_ok", username}
   Si falla: {type: "register_fail", msg}
   ↓
7. MessageHandler procesa respuesta
   ↓
8. Éxito: UIManager.showChatScreen()
   Fallo: UIManager.showRegisterError()
```

## ⚠️ Notas de Seguridad

**IMPORTANTE**: Esta implementación es para desarrollo/educación.

### Para Producción se debe:
1. **Hashear contraseñas**: Usar bcrypt o Argon2
   ```java
   String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt(12));
   ```

2. **Validar formato de username**: Permitir solo caracteres alfanuméricos
   ```java
   if (!username.matches("^[a-zA-Z0-9_]{3,20}$")) {
       // rechazar
   }
   ```

3. **Limitar intentos de registro**: Prevenir spam
4. **Validar email**: Agregar campo email con verificación
5. **Tokens CSRF**: Proteger formularios
6. **Rate limiting**: Limitar requests por IP
7. **HTTPS**: Cifrar comunicación WebSocket (wss://)

## 🎨 Estilos CSS

Los estilos para el formulario de registro se agregaron en `styles.css`:

```css
.register-link {
    text-align: center;
    margin-top: 16px;
    font-size: 0.9rem;
    color: #666;
}

.register-link a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
}
```

## 🐛 Solución de Problemas

### Error: "El usuario ya existe"
- El username debe ser único
- Intenta con otro nombre de usuario

### Error: "Error al conectar con el servidor"
- Verifica que el servidor Java esté corriendo
- Verifica la URL del WebSocket en WebSocketManager.js

### Error: "Las contraseñas no coinciden"
- Asegúrate de escribir la misma contraseña en ambos campos

### Base de datos no conecta
- Verifica credenciales en `DBConnection.java`
- Verifica que MySQL esté corriendo
- Verifica que la base de datos `chatapp` exista

## 📁 Archivos Modificados

### Backend Java
- ✅ `src/main/java/server/dao/UserDAO.java` - Método registerUser()
- ✅ `src/main/java/server/ClientHandler.java` - Soporte REGISTER command
- ✅ `src/main/java/server/ChatWebSocketServer.java` - Case "register"

### Frontend JavaScript
- ✅ `frontend/frontend/index.html` - Sección de registro
- ✅ `frontend/frontend/styles.css` - Estilos de registro
- ✅ `frontend/frontend/js/ChatApplication.js` - handleRegister()
- ✅ `frontend/frontend/js/managers/UIManager.js` - Pantallas de registro
- ✅ `frontend/frontend/js/managers/WebSocketManager.js` - Método register()
- ✅ `frontend/frontend/js/handlers/MessageHandler.js` - Handlers de registro

### Base de Datos
- ✅ `database/create_tables.sql` - Script de creación

## ✅ Testing

### Probar registro exitoso:
1. Usuario: "testuser123"
2. Nombre: "Usuario de Prueba"
3. Contraseña: "test1234"
4. Confirmar: "test1234"
5. ✅ Debe crear cuenta e iniciar sesión automáticamente

### Probar usuario duplicado:
1. Intentar registrar "admin" (ya existe)
2. ❌ Debe mostrar error: "El usuario ya existe o hubo un error"

### Probar validaciones:
1. Dejar campos vacíos → Error
2. Usuario con 2 caracteres → Error
3. Contraseña con 3 caracteres → Error
4. Contraseñas diferentes → Error

## 🎉 Resultado Final

Ahora los usuarios pueden:
- ✅ Crear cuenta nueva desde la interfaz
- ✅ Iniciar sesión con cuenta existente
- ✅ Alternar fácilmente entre registro y login
- ✅ Ver errores claros si algo falla
- ✅ Iniciar chat automáticamente tras registro exitoso
