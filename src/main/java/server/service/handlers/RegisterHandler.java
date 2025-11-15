package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class RegisterHandler implements ServerMessageHandler {
    @Override public String type() { return "register"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        String username = MessageContext.safeStr(payload.get("username"));
        String fullName = MessageContext.safeStr(payload.get("fullName"));
        String password = MessageContext.safeStr(payload.get("password"));
        if (username.isEmpty() || password.isEmpty()) {
            conn.send(ctx.json("type","register_fail","msg","empty credentials"));
            return;
        }
        User u = ctx.userDAO().registerUser(username, fullName, password);
        if (u != null) {
            ctx.sessions().put(conn, u);
            conn.send(ctx.json("type","register_ok","username", u.getUsername()));
            ctx.broadcast(ctx.json("type","userlist","users", ctx.currentUsers()));
            ctx.audit().recordSystem("Usuario registrado: " + u.getUsername());
            ctx.audit().recordLogin(u.getUsername());
        } else {
            conn.send(ctx.json("type","register_fail","msg","username already exists"));
        }
    }
}
