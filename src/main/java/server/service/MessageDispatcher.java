package server.service;

import java.util.HashMap;
import java.util.Map;

import org.java_websocket.WebSocket;

/**
 * Registra y despacha handlers por tipo de mensaje.
 */
public final class MessageDispatcher {
    private final Map<String, ServerMessageHandler> registry = new HashMap<>();

    public MessageDispatcher register(ServerMessageHandler handler) {
        registry.put(handler.type(), handler);
        return this;
    }

    public void dispatch(MessageContext ctx, WebSocket conn, String type, Map<String,Object> payload) {
        ServerMessageHandler h = registry.get(type);
        if (h == null) {
            conn.send(ctx.json("type","error","msg","unknown type: " + type));
            return;
        }
        h.handle(ctx, conn, payload);
    }
}
