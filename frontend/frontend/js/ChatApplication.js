import DOMUtils from './utils/DOMUtils.js';
import WebSocketManager from './managers/WebSocketManager.js';
import UIManager from './managers/UIManager.js';
import FileManager from './managers/FileManager.js';
import VideoCallManager from './managers/VideoCallManager.js';
import MessageHandler from './handlers/MessageHandler.js';

/**
 * ChatApplication - Orquestador principal de la aplicación
 * Patrón Facade que coordina todos los módulos
 */
class ChatApplication {
  constructor() {
    // Inicializar managers (Singletons)
    this.wsManager = WebSocketManager.getInstance();
    this.uiManager = UIManager.getInstance();
    this.fileManager = FileManager.getInstance();
    this.videoCallManager = VideoCallManager.getInstance();
    
    // Inicializar handler de mensajes
    this.messageHandler = new MessageHandler();
    
    // Estado de la aplicación
    this.initialized = false;
  }

  /**
   * Inicializa la aplicación
   */
  init() {
    if (this.initialized) {
      console.warn('Aplicación ya inicializada');
      return;
    }

    console.log('Inicializando NextChat...');
    
    // Inicializar referencias DOM de todos los managers
    console.log('Inicializando referencias DOM...');
    this.uiManager.initDOMReferences();
    this.videoCallManager.initDOMReferences();
    
    // Registrar eventos WebSocket
    console.log('Configurando listeners de WebSocket...');
    this.setupWebSocketListeners();
    
    // Registrar eventos UI
    console.log('Configurando listeners de UI...');
    this.setupUIListeners();
    
    this.initialized = true;
    console.log('NextChat iniciado correctamente');
    console.log('Estado UIManager:', this.uiManager);
  }

  /**
   * Configura listeners de WebSocket (Patrón Observer)
   */
  setupWebSocketListeners() {
    // Mensaje JSON recibido
    this.wsManager.on('message', (message) => {
      this.messageHandler.handleMessage(message);
    });

    // Conexión cerrada
    this.wsManager.on('close', (event) => {
      if (!this.uiManager.loginSection.classList.contains('hidden')) return;
      this.uiManager.renderSystemMessage('Conexión cerrada');
    });

    // Error de conexión
    this.wsManager.on('error', (error) => {
      console.error('Error de WebSocket:', error);
    });
  }

  /**
   * Configura listeners de UI
   */
  setupUIListeners() {
    // Login
    const btnLogin = DOMUtils.$('#btnLogin');
    console.log('Botón login encontrado:', btnLogin);
    if (btnLogin) {
      btnLogin.onclick = () => {
        console.log('Click en botón login detectado');
        this.handleLogin();
      };
    } else {
      console.error('No se encontró el botón #btnLogin');
    }

    // Registro
    const btnRegister = DOMUtils.$('#btnRegister');
    if (btnRegister) {
      btnRegister.onclick = () => this.handleRegister();
    }

    // Mostrar pantalla de registro
    const showRegister = DOMUtils.$('#showRegister');
    if (showRegister) {
      showRegister.onclick = (e) => {
        e.preventDefault();
        this.uiManager.showRegisterScreen();
      };
    }

    // Mostrar pantalla de login
    const showLogin = DOMUtils.$('#showLogin');
    if (showLogin) {
      showLogin.onclick = (e) => {
        e.preventDefault();
        this.uiManager.showLoginScreen();
      };
    }

    // Enviar mensaje
    const btnSend = DOMUtils.$('#send');
    if (btnSend) {
      btnSend.onclick = () => this.handleSendMessage();
    }

    // Enter en input de texto
    const txtInput = DOMUtils.$('#txt');
    if (txtInput) {
      txtInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleSendMessage();
        }
      });
    }

    // Seleccionar archivo
    const fileInput = DOMUtils.$('#file');
    if (fileInput) {
      fileInput.onchange = (e) => this.handleSelectFile(e);
    }

    // Logout
    const btnLogout = DOMUtils.$('#btnLogout');
    if (btnLogout) {
      btnLogout.onclick = () => this.handleLogout();
    }

    // Videollamada - Toggle
    const btnJoinCall = DOMUtils.$('#btnJoinCall');
    if (btnJoinCall) {
      btnJoinCall.onclick = () => this.handleToggleVideoCall();
    }

    // Videollamada - Salir
    const btnLeaveCall = DOMUtils.$('#btnLeaveCall');
    if (btnLeaveCall) {
      btnLeaveCall.onclick = () => this.videoCallManager.leaveCall();
    }

    // Videollamada - Maximizar/Minimizar
    const btnMaximizeCall = DOMUtils.$('#btnMaximizeCall');
    if (btnMaximizeCall) {
      btnMaximizeCall.onclick = () => this.videoCallManager.toggleMaximize();
    }

    // Videollamada - Toggle micrófono
    const btnToggleMic = DOMUtils.$('#btnToggleMic');
    if (btnToggleMic) {
      btnToggleMic.onclick = () => this.videoCallManager.toggleMicrophone();
    }

    // Videollamada - Toggle cámara
    const btnToggleCam = DOMUtils.$('#btnToggleCam');
    if (btnToggleCam) {
      btnToggleCam.onclick = () => this.videoCallManager.toggleCamera();
    }

    // Videollamada - Compartir pantalla
    const btnShareScreen = DOMUtils.$('#btnShareScreen');
    if (btnShareScreen) {
      btnShareScreen.onclick = () => this.videoCallManager.shareScreen();
    }
  }

  /**
   * Maneja el proceso de login
   */
  async handleLogin() {
    console.log('handleLogin ejecutándose');
    const userInput = DOMUtils.$('#user');
    const passInput = DOMUtils.$('#pass');
    
    console.log('Inputs encontrados:', { user: userInput, pass: passInput });
    
    const username = userInput ? userInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';
    
    console.log('Credenciales:', { username, password });
    
    if (!username || !password) {
      console.log('Credenciales vacías');
      this.uiManager.showLoginError('Completa usuario y contraseña');
      return;
    }

    try {
      console.log('Intentando conectar al WebSocket...');
      // Conectar al WebSocket
      await this.wsManager.connect();
      
      console.log('Conectado, enviando autenticación...');
      // Autenticar
      this.wsManager.authenticate(username, password);
    } catch (err) {
      console.error('Error al conectar:', err);
      this.uiManager.showLoginError('Error al conectar con el servidor');
    }
  }

  /**
   * Maneja el proceso de registro
   */
  async handleRegister() {
    const usernameInput = DOMUtils.$('#regUsername');
    const fullNameInput = DOMUtils.$('#regFullName');
    const passwordInput = DOMUtils.$('#regPassword');
    const passwordConfirmInput = DOMUtils.$('#regPasswordConfirm');
    
    const username = usernameInput ? usernameInput.value.trim() : '';
    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value.trim() : '';
    
    // Validaciones
    if (!username || !fullName || !password || !passwordConfirm) {
      this.uiManager.showRegisterError('Completa todos los campos');
      return;
    }

    if (username.length < 3) {
      this.uiManager.showRegisterError('El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 4) {
      this.uiManager.showRegisterError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    if (password !== passwordConfirm) {
      this.uiManager.showRegisterError('Las contraseñas no coinciden');
      return;
    }

    try {
      // Conectar al WebSocket
      await this.wsManager.connect();
      
      // Registrar usuario
      this.wsManager.register(username, fullName, password);
    } catch (err) {
      console.error('Error al conectar:', err);
      this.uiManager.showRegisterError('Error al conectar con el servidor');
    }
  }

  /**
   * Maneja envío de mensaje de texto
   */
  handleSendMessage() {
    const content = this.uiManager.getTextInputValue();
    
    if (!content || !this.wsManager.connected()) {
      return;
    }

    // Enviar al servidor
    const success = this.wsManager.send({
      type: 'text',
      content: content
    });

    if (success) {
      this.uiManager.clearTextInput();
    }
  }

  /**
   * Maneja selección de archivo
   * @param {Event} event - Evento de cambio
   */
  async handleSelectFile(event) {
    const file = event.target.files[0];
    
    if (!file || !this.wsManager.connected()) {
      return;
    }

    await this.fileManager.sendFile(file);
    this.uiManager.clearFileInput();
  }

  /**
   * Maneja toggle de videollamada
   */
  async handleToggleVideoCall() {
    const currentUser = this.uiManager.getCurrentUser();
    
    if (this.videoCallManager.inCall) {
      this.videoCallManager.leaveCall();
    } else {
      const success = await this.videoCallManager.joinCall(currentUser);
      if (success) {
        this.uiManager.renderSystemMessage('Te has unido a la videollamada');
      }
    }
  }

  /**
   * Maneja logout
   */
  handleLogout() {
    // Cerrar videollamada si está activa
    if (this.videoCallManager.inCall) {
      this.videoCallManager.leaveCall();
    }

    // Cerrar WebSocket
    this.wsManager.logout();
    
    // Mostrar pantalla de login
    this.uiManager.showLoginScreen();
  }
}

export default ChatApplication;
