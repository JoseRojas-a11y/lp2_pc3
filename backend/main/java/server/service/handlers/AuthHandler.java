package server.service.handlers;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.HistoryRecord;
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
            // Recuperar historial y enviarlo al usuario recién autenticado
            List<HistoryRecord> history = ctx.actionDAO().getRecentHistory(200);
            List<Map<String,Object>> items = new ArrayList<>();
            for (HistoryRecord hr : history) {
                Map<String,Object> it = new LinkedHashMap<>();
                it.put("type", hr.getType());
                it.put("from", hr.getUsername());
                it.put("timestamp", hr.getTimestamp());
                if ("text".equals(hr.getType())) {
                    it.put("content", hr.getContent());
                } else if ("file".equals(hr.getType())) {
                    it.put("filename", hr.getFilename());
                    it.put("mimetype", hr.getMimetype());
                    it.put("size", hr.getSize());
                    it.put("data", hr.getDataBase64());
                }
                items.add(it);
            }
            conn.send(ctx.json("type","history","items", items));
            ctx.broadcast(ctx.json("type","userlist","users", ctx.currentUsers()));
            ctx.audit().recordLogin(u.getUsername());
        } else {
            conn.send(ctx.json("type","auth_fail","msg","bad credentials"));
            conn.close(1008, "Auth failed");
        }
    }
}
