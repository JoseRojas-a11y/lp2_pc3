package server.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.java_websocket.WebSocket;

import com.google.gson.Gson;

import server.dao.ActionDAO;
import server.dao.UserDAO;
import server.model.User;

/**
 * MessageContext: provee acceso controlado a estado y servicios del servidor
 * para los handlers. Respeta SRP al separar los detalles de infraestructura
 * (maps, DAOs, logger) del WebSocketServer.
 */
public final class MessageContext {
    private final ConcurrentHashMap<WebSocket, User> sessions;
    private final ConcurrentHashMap<String, WebSocket> videoRoomUsers;
    private final UserDAO userDAO;
    private final ActionDAO actionDAO;
    private final AuditService auditService;
    private final Gson gson;

    public MessageContext(ConcurrentHashMap<WebSocket, User> sessions,
                          ConcurrentHashMap<String, WebSocket> videoRoomUsers,
                          UserDAO userDAO,
                          ActionDAO actionDAO,
                          AuditService auditService,
                          Gson gson) {
        this.sessions = sessions;
        this.videoRoomUsers = videoRoomUsers;
        this.userDAO = userDAO;
        this.actionDAO = actionDAO;
        this.auditService = auditService;
        this.gson = gson;
    }

    public ConcurrentHashMap<WebSocket, User> sessions() { return sessions; }
    public ConcurrentHashMap<String, WebSocket> videoRoomUsers() { return videoRoomUsers; }
    public UserDAO userDAO() { return userDAO; }
    public ActionDAO actionDAO() { return actionDAO; }
    public AuditService audit() { return auditService; }

    public String json(Object... kv) {
        Map<String,Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(String.valueOf(kv[i]), kv[i+1]);
        }
        return gson.toJson(m);
    }

    public void broadcast(String payload) {
        for (WebSocket c : sessions.keySet()) if (c.isOpen()) c.send(payload);
    }

    public void broadcastExcept(WebSocket exclude, String payload) {
        for (WebSocket c : sessions.keySet()) if (c.isOpen() && c != exclude) c.send(payload);
    }

    public List<String> currentUsers() {
        ArrayList<String> list = new ArrayList<>();
        for (User u : sessions.values()) list.add(u.getUsername());
        Collections.sort(list);
        return list;
    }

    public static String safeStr(Object o) { return (o == null) ? "" : String.valueOf(o).trim(); }
}