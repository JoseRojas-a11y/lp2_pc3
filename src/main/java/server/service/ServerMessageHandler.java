package server.service;

import java.util.Map;

import org.java_websocket.WebSocket;

/**
 * Contrato para handlers de mensajes. Abre la puerta a Open/Closed: agregar
 * nuevos tipos sin modificar el servidor principal.
 */
public interface ServerMessageHandler {
    String type();
    void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload);
}
