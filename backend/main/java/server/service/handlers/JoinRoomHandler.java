package server.service.handlers;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class JoinRoomHandler implements ServerMessageHandler {
    @Override public String type() { return "join_room"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u == null) { conn.close(1008, "Not authed"); return; }
        String username = u.getUsername();
        List<String> currentRoomUsers = new ArrayList<>(ctx.videoRoomUsers().keySet());
        conn.send(ctx.json("type","room_users","users", currentRoomUsers));
        boolean wasEmpty = ctx.videoRoomUsers().isEmpty();
        ctx.videoRoomUsers().put(username, conn);
        if (wasEmpty) ctx.audit().recordSystem("Videollamada iniciada");
        ctx.audit().recordVideoJoin(username);
        for (var entry : ctx.videoRoomUsers().entrySet()) {
            if (!entry.getKey().equals(username) && entry.getValue().isOpen()) {
                entry.getValue().send(ctx.json("type","user_joined","username",username));
            }
        }
    }
}
