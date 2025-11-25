import FileUtils from '../utils/FileUtils.js';
import UIManager from './UIManager.js';
import WebSocketManager from './WebSocketManager.js';

/**
 * FileManager - Gestiona envío, recepción y renderizado de archivos
 * Patrón Strategy para diferentes tipos de procesamiento de archivos
 */
class FileManager {
  static instance = null;

  constructor() {
    if (FileManager.instance) {
      return FileManager.instance;
    }

    this.wsManager = WebSocketManager.getInstance();
    this.uiManager = UIManager.getInstance();

    FileManager.instance = this;
  }

  /**
   * Obtiene la instancia única
   * @returns {FileManager}
   */
  static getInstance() {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  /**
   * Envía un archivo al servidor
   * @param {File} file - Archivo a enviar
   * @returns {Promise<void>}
   */
  async sendFile(file) {
    if (!file || !this.wsManager.connected()) {
      console.warn('No se puede enviar archivo: no hay archivo o no hay conexión');
      return;
    }

    try {
      // Leer archivo como ArrayBuffer
      const buffer = await this.readFileAsArrayBuffer(file);
      
      // Convertir a Base64
      const base64 = FileUtils.arrayBufferToBase64(buffer);
      
      // Enviar como JSON con metadatos
      const success = this.wsManager.send({
        type: 'file',
        filename: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
        data: base64
      });

      if (success) {
        // Mostrar archivo propio en el chat
        const url = FileUtils.createObjectURL(
          new Blob([buffer], { type: file.type || 'application/octet-stream' })
        );
        
        const currentUser = this.uiManager.getCurrentUser();
        this.renderFile(url, file.name, currentUser, true, Date.now());
      }
    } catch (err) {
      console.error('Error al enviar archivo:', err);
      this.uiManager.renderSystemMessage('Error al enviar el archivo');
    }
  }

  /**
   * Lee un archivo como ArrayBuffer
   * @param {File} file - Archivo a leer
   * @returns {Promise<ArrayBuffer>}
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Recibe un archivo del servidor
   * @param {string} from - Usuario que envía
   * @param {string} filename - Nombre del archivo
   * @param {string} mimetype - Tipo MIME
   * @param {string} base64Data - Datos en Base64
   * @param {number} timestamp - Timestamp
   */
  receiveFile(from, filename, mimetype, base64Data, timestamp) {
    try {
      // Convertir Base64 a Blob con tipo MIME correcto
      const blob = FileUtils.base64ToBlob(base64Data, mimetype);
      const url = FileUtils.createObjectURL(blob);
      
      // Verificar si es propio (para historial)
      const currentUser = this.uiManager.getCurrentUser();
      const isMine = from === currentUser;

      // Renderizar en el chat
      this.renderFile(url, filename, from, isMine, timestamp);
    } catch (err) {
      console.error('Error al recibir archivo:', err);
      this.uiManager.renderSystemMessage(`Error al recibir archivo de ${from}`);
    }
  }

  /**
   * Renderiza un archivo en el chat
   * @param {string} url - URL del archivo
   * @param {string} filename - Nombre del archivo
   * @param {string} from - Usuario que envía
   * @param {boolean} isMine - Si es archivo propio
   * @param {number} timestamp - Timestamp
   */
  renderFile(url, filename, from, isMine = false, timestamp = Date.now()) {
    this.uiManager.renderFileMessage(url, filename, from, isMine, timestamp);
  }

  /**
   * Obtiene emoji por extensión de archivo
   * @param {string} filename - Nombre del archivo
   * @returns {string} Emoji correspondiente
   */
  getFileEmoji(filename) {
    const extension = FileUtils.getExtension(filename);
    return FileUtils.getEmojiByExtension(extension);
  }
}

export default FileManager;
