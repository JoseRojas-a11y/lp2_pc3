import DOMUtils from '../utils/DOMUtils.js';
import FileUtils from '../utils/FileUtils.js';

/**
 * UIManager - Gestiona toda la interfaz de usuario
 * Patrón Singleton para mantener estado consistente de la UI
 */
class UIManager {
  static instance = null;

  constructor() {
    if (UIManager.instance) {
      return UIManager.instance;
    }

    this.currentUser = null;
    this.loginSection = null;
    this.registerSection = null;
    this.chatSection = null;
    this.messagesContainer = null;
    this.userListContainer = null;
    this.loginMessage = null;
    this.registerMessage = null;

    UIManager.instance = this;
  }

  /**
   * Inicializa referencias DOM (debe llamarse después de DOMContentLoaded)
   */
  initDOMReferences() {
    this.loginSection = DOMUtils.$('#login');
    this.registerSection = DOMUtils.$('#register');
    this.chatSection = DOMUtils.$('#chat');
    this.messagesContainer = DOMUtils.$('#messages');
    this.userListContainer = DOMUtils.$('#userList');
    this.loginMessage = DOMUtils.$('#loginMsg');
    this.registerMessage = DOMUtils.$('#registerMsg');
  }

  /**
   * Obtiene la instancia única
   * @returns {UIManager}
   */
  static getInstance() {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  /**
   * Establece el usuario actual
   * @param {string} username - Nombre de usuario
   */
  setCurrentUser(username) {
    this.currentUser = username;
  }

  /**
   * Obtiene el usuario actual
   * @returns {string}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Muestra la pantalla de chat
   * @param {string} username - Nombre del usuario autenticado
   */
  showChatScreen(username) {
    this.currentUser = username;
    this.loginSection.classList.add('hidden');
    this.registerSection.classList.add('hidden');
    this.chatSection.classList.remove('hidden');
    
    // Limpiar formularios
    this.clearLoginForm();
    this.clearRegisterForm();
    
    // Añadir usuario actual a la lista
    this.renderUserList([username]);
  }

  /**
   * Muestra la pantalla de login
   */
  showLoginScreen() {
    this.chatSection.classList.add('hidden');
    this.registerSection.classList.add('hidden');
    this.loginSection.classList.remove('hidden');
    this.messagesContainer.innerHTML = '';
    if (this.userListContainer) {
      this.userListContainer.innerHTML = '';
    }
    this.currentUser = null;
  }

  /**
   * Muestra la pantalla de registro
   */
  showRegisterScreen() {
    this.chatSection.classList.add('hidden');
    this.loginSection.classList.add('hidden');
    this.registerSection.classList.remove('hidden');
    this.loginMessage.textContent = '';
    this.registerMessage.textContent = '';
  }

  /**
   * Muestra mensaje de error en login
   * @param {string} message - Mensaje de error
   */
  showLoginError(message) {
    this.loginMessage.textContent = message;
  }

  /**
   * Muestra mensaje de error en registro
   * @param {string} message - Mensaje de error
   */
  showRegisterError(message) {
    this.registerMessage.textContent = message;
  }

  /**
   * Muestra mensaje de éxito en registro
   * @param {string} message - Mensaje de éxito
   */
  showRegisterSuccess(message) {
    this.registerMessage.textContent = message;
    this.registerMessage.style.color = '#28a745';
  }

  /**
   * Renderiza un mensaje de texto en el chat
   * @param {string} from - Usuario que envía
   * @param {string} content - Contenido del mensaje
   * @param {number} timestamp - Timestamp del mensaje
   * @param {boolean} isMine - Si es mensaje propio
   */
  renderTextMessage(from, content, timestamp, isMine = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-container' + (isMine ? ' mine' : '');
    
    wrapper.innerHTML = `
      <div class="msg-avatar">
        ${DOMUtils.getAvatarSVG()}
        <div class="msg-username">${DOMUtils.escapeHtml(from)}</div>
      </div>
      <div class="msg-bubble ${isMine ? 'me' : ''}">
        <div class="msg-content">${DOMUtils.escapeHtml(content)}</div>
        <div class="msg-time">${DOMUtils.formatTime(timestamp)}</div>
      </div>
    `;
    
    this.messagesContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  /**
   * Renderiza un archivo en el chat
   * @param {string} url - URL del archivo
   * @param {string} filename - Nombre del archivo
   * @param {string} from - Usuario que envía
   * @param {boolean} isMine - Si es archivo propio
   * @param {number} timestamp - Timestamp
   */
  renderFileMessage(url, filename, from, isMine = false, timestamp = Date.now()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-container' + (isMine ? ' mine' : '');
    
    // Obtener extensión y emoji
    const extension = filename.includes('.') ? filename.split('.').pop().toUpperCase() : 'FILE';
    const emoji = this.getFileEmoji(extension);
    
    wrapper.innerHTML = `
      <div class="msg-avatar">
        ${DOMUtils.getAvatarSVG()}
        <div class="msg-username">${DOMUtils.escapeHtml(from)}</div>
      </div>
      <div class="msg-bubble ${isMine ? 'me' : ''}">
        <div class="msg-content file-message">
          <div class="file-icon">${emoji}</div>
          <div class="file-info">
            <a class="file-link" href="${url}" download="${DOMUtils.escapeAttribute(filename)}">
              ${DOMUtils.escapeHtml(filename)}
            </a>
            <span class="file-badge">${extension}</span>
          </div>
        </div>
        <div class="msg-time">${DOMUtils.formatTime(timestamp)}</div>
      </div>
    `;
    
    this.messagesContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  /**
   * Obtiene emoji por extensión del archivo
   * @param {string} extension - Extensión del archivo
   * @returns {string} Emoji
   */
  getFileEmoji(extension) {
    return FileUtils.getEmojiByExtension(extension);
  }

  /**
   * Renderiza mensaje del sistema
   * @param {string} message - Mensaje a mostrar
   */
  renderSystemMessage(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg';
    wrapper.innerHTML = `
      <div class="meta">Sistema</div>
      <div class="content">${DOMUtils.escapeHtml(message)}</div>
    `;
    this.messagesContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  /**
   * Renderiza la lista de usuarios conectados
   * @param {Array<string>} users - Lista de usuarios
   */
  renderUserList(users) {
    if (!this.userListContainer) return;
    
    this.userListContainer.innerHTML = '';
    
    // Ordenar: usuario actual primero
    const sortedUsers = (users || []).sort((a, b) => {
      if (a === this.currentUser) return -1;
      if (b === this.currentUser) return 1;
      return a.localeCompare(b);
    });

    sortedUsers.forEach(user => {
      const li = document.createElement('li');
      li.className = 'user' + (user === this.currentUser ? ' me' : '');
      li.innerHTML = `
        <span class="status"></span>
        <span class="name">${DOMUtils.escapeHtml(user)}</span>
      `;
      this.userListContainer.appendChild(li);
    });
  }

  /**
   * Scroll al final del contenedor de mensajes
   */
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Limpia el input de texto
   */
  clearTextInput() {
    const textInput = DOMUtils.$('#txt');
    if (textInput) {
      textInput.value = '';
    }
  }

  /**
   * Limpia el input de archivo
   */
  clearFileInput() {
    const fileInput = DOMUtils.$('#file');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Limpia los campos del formulario de registro
   */
  clearRegisterForm() {
    const regUsername = DOMUtils.$('#regUsername');
    const regFullName = DOMUtils.$('#regFullName');
    const regPassword = DOMUtils.$('#regPassword');
    const regPasswordConfirm = DOMUtils.$('#regPasswordConfirm');
    
    if (regUsername) regUsername.value = '';
    if (regFullName) regFullName.value = '';
    if (regPassword) regPassword.value = '';
    if (regPasswordConfirm) regPasswordConfirm.value = '';
    
    this.registerMessage.textContent = '';
    if (this.registerMessage.style) {
      this.registerMessage.style.color = '';
    }
  }

  /**
   * Limpia los campos del formulario de login
   */
  clearLoginForm() {
    const userInput = DOMUtils.$('#user');
    const passInput = DOMUtils.$('#pass');
    
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    
    this.loginMessage.textContent = '';
  }

  /**
   * Obtiene el valor del input de texto
   * @returns {string}
   */
  getTextInputValue() {
    const textInput = DOMUtils.$('#txt');
    return textInput ? textInput.value.trim() : '';
  }
}

export default UIManager;
