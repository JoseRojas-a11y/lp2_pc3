/**
 * WebSocketManager - Gestiona la conexión WebSocket
 * Patrón Singleton para mantener una única conexión
 * Patrón Observer para notificar eventos
 */
class WebSocketManager {
  static instance = null;

  constructor() {
    if (WebSocketManager.instance) {
      return WebSocketManager.instance;
    }

    this.ws = null;
    this.serverUrl = 'ws://localhost:8081/';
    this.listeners = new Map(); // Patrón Observer
    this.isConnected = false;

    WebSocketManager.instance = this;
  }

  /**
   * Obtiene la instancia única
   * @returns {WebSocketManager}
   */
  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Establece la URL del servidor
   * @param {string} url - URL del servidor WebSocket
   */
  setServerUrl(url) {
    this.serverUrl = url;
  }

  /**
   * Conecta al servidor WebSocket
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket conectado');
          this.isConnected = true;
          this.emit('open');
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const message = JSON.parse(event.data);
              this.emit('message', message);
            } catch (err) {
              console.error('Error al parsear mensaje:', err);
            }
          } else {
            // Mensaje binario
            this.emit('binary', event.data);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket cerrado:', event.reason || event.code);
          this.isConnected = false;
          this.emit('close', event);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Envía un mensaje JSON al servidor
   * @param {Object} data - Datos a enviar
   * @returns {boolean} True si se envió correctamente
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket no está conectado');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      return false;
    }
  }

  /**
   * Envía datos binarios al servidor
   * @param {ArrayBuffer|Blob} data - Datos binarios
   * @returns {boolean} True si se envió correctamente
   */
  sendBinary(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket no está conectado');
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (err) {
      console.error('Error al enviar datos binarios:', err);
      return false;
    }
  }

  /**
   * Cierra la conexión WebSocket
   */
  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        console.error('Error al cerrar WebSocket:', err);
      }
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Verifica si está conectado
   * @returns {boolean}
   */
  connected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Registra un listener para un evento (Patrón Observer)
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Elimina un listener
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback a eliminar
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emite un evento a todos los listeners
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos del evento
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error en listener de ${event}:`, err);
      }
    });
  }

  /**
   * Envía autenticación al servidor
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   */
  authenticate(username, password) {
    return this.send({
      type: 'auth',
      username,
      password
    });
  }

  /**
   * Envía registro de nuevo usuario al servidor
   * @param {string} username - Nombre de usuario
   * @param {string} fullName - Nombre completo
   * @param {string} password - Contraseña
   */
  register(username, fullName, password) {
    return this.send({
      type: 'register',
      username,
      fullName,
      password
    });
  }

  /**
   * Envía mensaje de logout
   */
  logout() {
    this.send({ type: 'logout' });
    this.close();
  }
}

export default WebSocketManager;
