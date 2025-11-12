/**
 * DOMUtils - Utilidades para manipulación del DOM
 * Proporciona funciones auxiliares para selección y formateo
 */
class DOMUtils {
  /**
   * Selector de un solo elemento
   * @param {string} selector - Selector CSS
   * @returns {Element} Elemento del DOM
   */
  static $(selector) {
    return document.querySelector(selector);
  }

  /**
   * Selector de múltiples elementos
   * @param {string} selector - Selector CSS
   * @returns {NodeList} Lista de elementos
   */
  static $$(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Escapa caracteres HTML para prevenir XSS
   * @param {string} str - Texto a escapar
   * @returns {string} Texto escapado
   */
  static escapeHtml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Escapa atributos HTML
   * @param {string} str - Texto a escapar
   * @returns {string} Texto escapado
   */
  static escapeAttribute(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  /**
   * Formatea timestamp a hora local
   * @param {number} timestamp - Timestamp en milisegundos
   * @returns {string} Hora formateada
   */
  static formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  /**
   * Genera SVG de avatar
   * @returns {string} SVG HTML
   */
  static getAvatarSVG() {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="clip-circle">
        <circle cx="20" cy="20" r="20"/>
      </clipPath>
      <circle cx="20" cy="20" r="20" fill="#BBBCBC"/>
      <g clip-path="url(#clip-circle)">
        <circle cx="20" cy="15" r="6.5" fill="#F2F2F2"/>
        <ellipse cx="20" cy="38" rx="14" ry="12" fill="#F2F2F2"/>
      </g>
    </svg>`;
  }
}

export default DOMUtils;
