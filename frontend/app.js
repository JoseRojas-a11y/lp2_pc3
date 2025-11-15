
/**
 * NextChat - Aplicación de mensajería con videollamadas
 * Punto de entrada principal - Orquestador
 * 
 * Arquitectura modular con patrones de diseño:
 * - Singleton: WebSocketManager, UIManager, FileManager, VideoCallManager
 * - Strategy: MessageHandler para procesar diferentes tipos de mensajes
 * - Observer: Sistema de eventos en WebSocketManager
 * - Facade: ChatApplication coordina todos los módulos
 */

import ChatApplication from './chatDetails/ChatApplication.js';

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChatApplication();
  app.init();
});