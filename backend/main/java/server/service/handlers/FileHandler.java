package server.service.handlers;

import java.util.Base64;
import java.util.Map;

import org.java_websocket.WebSocket;

import server.model.User;
import server.service.MessageContext;
import server.service.ServerMessageHandler;

public final class FileHandler implements ServerMessageHandler {
    @Override public String type() { return "file"; }

    @Override
    public void handle(MessageContext ctx, WebSocket conn, Map<String,Object> payload) {
        User u = ctx.sessions().get(conn);
        if (u == null) { conn.close(1008, "Not authed"); return; }
        String filename = MessageContext.safeStr(payload.get("filename"));
        String mimetype = MessageContext.safeStr(payload.get("mimetype"));
        Object data = payload.get("data");
        Object size = payload.get("size");
        long ts = System.currentTimeMillis();
        if (filename.isEmpty() || data == null) {
            conn.send(ctx.json("type","error","msg","Archivo inválido"));
            return;
        }
        try {
            long declaredSize = (size instanceof Number n) ? n.longValue() : 0L;
            String b64 = (data instanceof String s) ? s : String.valueOf(data);
            byte[] bytes = Base64.getDecoder().decode(b64);
            // Persistir vía servicio de auditoría (único punto)
            ctx.audit().recordFile(u.getUsername(), filename, mimetype, declaredSize, bytes);
        } catch (IllegalArgumentException ex) {
            ctx.audit().recordSystem("ERROR - Base64 inválido para archivo: " + filename);
        }
        String payloadJson = ctx.json("type","file","from",u.getUsername(),"filename",filename,
                "mimetype",mimetype,"size",size,"data",data,"timestamp",ts);
        ctx.broadcastExcept(conn, payloadJson);
    }
}
