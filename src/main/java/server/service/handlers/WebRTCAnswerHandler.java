package server.service.handlers;

import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class WebRTCAnswerHandler implements ServerMessageHandler {
    @Override public String type() { return "webrtc_answer"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u == null) { conn.close(1008,"Not authed"); return; }
        String to = MessageContext.safeStr(payload.get("to"));
        Object answer = payload.get("answer");
        WebSocket targetConn = ctx.videoRoomUsers().get(to);
        if (targetConn != null && targetConn.isOpen()) {
            targetConn.send(ctx.json("type","webrtc_answer","from",u.getUsername(),"answer",answer));
        }
    }
}
