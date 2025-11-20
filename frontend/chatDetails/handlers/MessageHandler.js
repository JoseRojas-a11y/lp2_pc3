import UIManager from '../managers/UIManager.js';
import FileManager from '../managers/FileManager.js';
import VideoCallManager from '../managers/VideoCallManager.js';

/**
 * MessageHandler - Procesa mensajes del servidor
 * Patrón Strategy para diferentes tipos de mensajes
 */
class MessageHandler {
  constructor() {
    this.uiManager = UIManager.getInstance();
    this.fileManager = FileManager.getInstance();
    this.videoCallManager = VideoCallManager.getInstance();
    
    // Map de estrategias de procesamiento por tipo de mensaje
    this.strategies = new Map([
      ['auth_ok', this.handleAuthOk.bind(this)],
      ['auth_fail', this.handleAuthFail.bind(this)],
      ['register_ok', this.handleRegisterOk.bind(this)],
      ['register_fail', this.handleRegisterFail.bind(this)],
      ['userlist', this.handleUserList.bind(this)],
      ['history', this.handleHistory.bind(this)],
      ['text', this.handleTextMessage.bind(this)],
      ['file', this.handleFileMessage.bind(this)],
      ['error', this.handleError.bind(this)],
      ['room_users', this.handleRoomUsers.bind(this)],
      ['user_joined', this.handleUserJoined.bind(this)],
      ['user_left', this.handleUserLeft.bind(this)],
      ['webrtc_offer', this.handleWebRTCOffer.bind(this)],
      ['webrtc_answer', this.handleWebRTCAnswer.bind(this)],
      ['webrtc_ice', this.handleWebRTCIce.bind(this)]
    ]);
  }

  /**
   * Maneja historial inicial de mensajes
   * @param {Object} message - Mensaje history con items
   */
  handleHistory(message) {
    const items = Array.isArray(message.items) ? message.items : [];
    // Reproduce cada item como si fuera mensaje normal
    for (const it of items) {
      // Aseguramos timestamp por compatibilidad
      if (!it.timestamp) it.timestamp = Date.now();
      this.handleMessage(it);
    }
  }

  /**
   * Procesa un mensaje del servidor (Strategy Pattern)
   * @param {Object} message - Mensaje recibido
   */
  handleMessage(message) {
    const strategy = this.strategies.get(message.type);
    
    if (strategy) {
      strategy(message);
    } else {
      console.warn('Tipo de mensaje desconocido:', message.type);
    }
  }

  /**
   * Maneja autenticación exitosa
   * @param {Object} message - Mensaje auth_ok
   */
  handleAuthOk(message) {
    this.uiManager.showChatScreen(message.username);
  }

  /**
   * Maneja fallo de autenticación
   * @param {Object} message - Mensaje auth_fail
   */
  handleAuthFail(message) {
    this.uiManager.showLoginError('Datos incorrectos');
  }

  /**
   * Maneja registro exitoso
   * @param {Object} message - Mensaje register_ok
   */
  handleRegisterOk(message) {
    this.uiManager.showChatScreen(message.username);
  }

  /**
   * Maneja fallo de registro
   * @param {Object} message - Mensaje register_fail
   */
  handleRegisterFail(message) {
    this.uiManager.showRegisterError('El usuario ya existe o hubo un error');
  }

  /**
   * Maneja lista de usuarios conectados
   * @param {Object} message - Mensaje userlist
   */
  handleUserList(message) {
    this.uiManager.renderUserList(message.users || []);
  }

  /**
   * Maneja mensaje de texto
   * @param {Object} message - Mensaje text
   */
  handleTextMessage(message) {
    const currentUser = this.uiManager.getCurrentUser();
    const isMine = message.from === currentUser;
    this.uiManager.renderTextMessage(
      message.from,
      message.content,
      message.timestamp,
      isMine
    );
  }

  /**
   * Maneja mensaje de archivo
   * @param {Object} message - Mensaje file
   */
  handleFileMessage(message) {
    this.fileManager.receiveFile(
      message.from,
      message.filename,
      message.mimetype,
      message.data,
      message.timestamp
    );
  }

  /**
   * Maneja mensaje de error
   * @param {Object} message - Mensaje error
   */
  handleError(message) {
    this.uiManager.renderSystemMessage(`Error: ${message.msg || 'desconocido'}`);
  }

  /**
   * Maneja lista de usuarios en sala de video
   * @param {Object} message - Mensaje room_users
   */
  handleRoomUsers(message) {
    this.videoCallManager.handleRoomUsers(message.users || []);
  }

  /**
   * Maneja usuario que se unió a videollamada
   * @param {Object} message - Mensaje user_joined
   */
  handleUserJoined(message) {
    this.videoCallManager.handleUserJoined(message.username);
    this.uiManager.renderSystemMessage(`${message.username} se unió a la videollamada`);
  }

  /**
   * Maneja usuario que salió de videollamada
   * @param {Object} message - Mensaje user_left
   */
  handleUserLeft(message) {
    this.videoCallManager.handleUserLeft(message.username);
    this.uiManager.renderSystemMessage(`${message.username} salió de la videollamada`);
  }

  /**
   * Maneja oferta WebRTC
   * @param {Object} message - Mensaje webrtc_offer
   */
  handleWebRTCOffer(message) {
    this.videoCallManager.handleOffer(message.from, message.offer);
  }

  /**
   * Maneja respuesta WebRTC
   * @param {Object} message - Mensaje webrtc_answer
   */
  handleWebRTCAnswer(message) {
    this.videoCallManager.handleAnswer(message.from, message.answer);
  }

  /**
   * Maneja ICE candidate WebRTC
   * @param {Object} message - Mensaje webrtc_ice
   */
  handleWebRTCIce(message) {
    this.videoCallManager.handleIceCandidate(message.from, message.candidate);
  }
}

export default MessageHandler;
