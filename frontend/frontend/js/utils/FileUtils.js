/**
 * FileUtils - Utilidades para conversión y procesamiento de archivos
 */
class FileUtils {
  /**
   * Convierte ArrayBuffer a Base64
   * @param {ArrayBuffer} buffer - Buffer a convertir
   * @returns {string} String en Base64
   */
  static arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convierte Base64 a ArrayBuffer
   * @param {string} base64 - String en Base64
   * @returns {ArrayBuffer} Buffer resultante
   */
  static base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Obtiene emoji según extensión de archivo
   * @param {string} extension - Extensión del archivo
   * @returns {string} Emoji correspondiente
   */
  static getEmojiByExtension(extension) {
    const ext = extension.toUpperCase();
    const emojiMap = {
      // Imágenes
      'JPG': '🖼️', 'JPEG': '🖼️', 'PNG': '🖼️', 'GIF': '🖼️', 'SVG': '🖼️', 
      'WEBP': '🖼️', 'BMP': '🖼️', 'ICO': '🖼️',
      
      // Documentos
      'PDF': '📄', 'DOC': '📝', 'DOCX': '📝', 'TXT': '📝', 'RTF': '📝',
      'ODT': '📝', 'PAGES': '📝',
      
      // Hojas de cálculo
      'XLS': '📊', 'XLSX': '📊', 'CSV': '📊', 'ODS': '📊', 'NUMBERS': '📊',
      
      // Presentaciones
      'PPT': '📊', 'PPTX': '📊', 'KEY': '📊', 'ODP': '📊',
      
      // Archivos comprimidos
      'ZIP': '🗜️', 'RAR': '🗜️', '7Z': '🗜️', 'TAR': '🗜️', 'GZ': '🗜️',
      'BZ2': '🗜️', 'XZ': '🗜️',
      
      // Audio
      'MP3': '🎵', 'WAV': '🎵', 'OGG': '🎵', 'M4A': '🎵', 'FLAC': '🎵',
      'AAC': '🎵', 'WMA': '🎵', 'OPUS': '🎵',
      
      // Video
      'MP4': '🎬', 'AVI': '🎬', 'MKV': '🎬', 'MOV': '🎬', 'WMV': '🎬',
      'FLV': '🎬', 'WEBM': '🎬', 'M4V': '🎬',
      
      // Código fuente
      'JS': '💻', 'JAVA': '💻', 'PY': '💻', 'HTML': '💻', 'CSS': '💻',
      'JSON': '💻', 'XML': '💻', 'CPP': '💻', 'C': '💻', 'H': '💻',
      'PHP': '💻', 'SQL': '💻', 'SH': '💻', 'BAT': '💻', 'TS': '💻',
      'JSX': '💻', 'VUE': '💻', 'GO': '💻', 'RUST': '💻', 'SWIFT': '💻',
      
      // Otros
      'EXE': '⚙️', 'DLL': '⚙️', 'APK': '📱', 'IPA': '📱',
      'FONT': '🔤', 'TTF': '🔤', 'OTF': '🔤', 'WOFF': '🔤'
    };
    
    return emojiMap[ext] || '📎';
  }

  /**
   * Extrae la extensión de un nombre de archivo
   * @param {string} filename - Nombre del archivo
   * @returns {string} Extensión en mayúsculas
   */
  static getExtension(filename) {
    return filename.includes('.') 
      ? filename.split('.').pop().toUpperCase() 
      : 'FILE';
  }

  /**
   * Crea un Blob desde Base64 con tipo MIME
   * @param {string} base64 - Datos en Base64
   * @param {string} mimeType - Tipo MIME del archivo
   * @returns {Blob} Blob resultante
   */
  static base64ToBlob(base64, mimeType) {
    const arrayBuffer = this.base64ToArrayBuffer(base64);
    return new Blob([arrayBuffer], { type: mimeType });
  }

  /**
   * Crea URL de objeto desde un Blob
   * @param {Blob} blob - Blob del archivo
   * @returns {string} URL del objeto
   */
  static createObjectURL(blob) {
    return URL.createObjectURL(blob);
  }
}

export default FileUtils;
