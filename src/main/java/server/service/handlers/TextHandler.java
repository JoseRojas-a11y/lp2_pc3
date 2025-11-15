package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class TextHandler implements ServerMessageHandler {
    @Override public String type() { return "text"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u == null) { 
            conn.close(1008, "Not authed"); 
            return; 
        }
        String content = MessageContext.safeStr(payload.get("content"));
        if (content.isEmpty()) return;
        long ts = System.currentTimeMillis();
        ctx.broadcast(ctx.json("type","text","from",u.getUsername(),"content",content,"timestamp",ts));
        ctx.audit().recordText(u.getUsername(), content);
    }
}
