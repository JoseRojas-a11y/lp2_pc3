package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class LeaveRoomHandler implements ServerMessageHandler {
    @Override public String type() { return "leave_room"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u == null) return;
        String username = u.getUsername();
        ctx.videoRoomUsers().remove(username);
        ctx.audit().recordVideoLeave(username);
        for (var entry : ctx.videoRoomUsers().entrySet()) {
            if (entry.getValue().isOpen()) {
                entry.getValue().send(ctx.json("type","user_left","username",username));
            }
        }
        if (ctx.videoRoomUsers().isEmpty()) ctx.audit().recordSystem("Videollamada finalizada");
    }
}
