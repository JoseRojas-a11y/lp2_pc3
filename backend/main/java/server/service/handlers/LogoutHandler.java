package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class LogoutHandler implements ServerMessageHandler {
    @Override public String type() { return "logout"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u != null) ctx.audit().recordLogout(u.getUsername());
        conn.close(1000, "bye");
    }
}
