package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class AuthHandler implements ServerMessageHandler {
    @Override public String type() { return "auth"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        String username = MessageContext.safeStr(payload.get("username"));
        String password = MessageContext.safeStr(payload.get("password"));
        if (username.isEmpty() || password.isEmpty()) {
            conn.send(ctx.json("type","auth_fail","msg","empty credentials"));
            conn.close(1008, "Auth failed");
            return;
        }
        User u = ctx.userDAO().authenticate(username, password);
        if (u != null) {
            ctx.sessions().put(conn, u);
            conn.send(ctx.json("type","auth_ok","username", u.getUsername()));
            ctx.broadcast(ctx.json("type","userlist","users", ctx.currentUsers()));
            ctx.audit().recordLogin(u.getUsername());
        } else {
            conn.send(ctx.json("type","auth_fail","msg","bad credentials"));
            conn.close(1008, "Auth failed");
        }
    }
}
