package server;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import server.dao.UserDAO;
import server.model.User;

/**
 * Servidor WebSocket para conectar con un frontend en JavaScript.
 * - Autenticación: type=auth {username, password} -> valida con UserDAO.authenticate
 * - Mensaje texto: type=text {content}
 * - Logout: type=logout
 * - Lista de usuarios conectados: type=userlist {users:[...]} (broadcast automático)
 * - Archivos: recibe binario y lo reenvía a todos tal cual (versión simple)
 */
public class ChatWebSocketServer extends WebSocketServer {

    // Conexión -> usuario autenticado
    private final ConcurrentHashMap<WebSocket, User> sessions = new ConcurrentHashMap<>();
    // Usuarios en videollamada
    private final ConcurrentHashMap<String, WebSocket> videoRoomUsers = new ConcurrentHashMap<>();
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Gson gson = new Gson();
    private final UserDAO userDAO;

    public ChatWebSocketServer(int port, UserDAO userDAO) {
        super(new InetSocketAddress(port));
        this.userDAO = userDAO;
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server ON ws://10.159.125.105:" + getPort() + "/");
        setConnectionLostTimeout(30);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Nueva conexión WS: " + conn.getRemoteSocketAddress());
        // Aún no autenticado: esperamos type=auth
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        pool.submit(() -> handleText(conn, message));
    }

    @Override
    public void onMessage(WebSocket conn, ByteBuffer bytes) {
        pool.submit(() -> handleBinary(conn, bytes));
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        User u = sessions.remove(conn);
        if (u != null) {
            String username = u.getUsername();
            System.out.println("WS cerrado: " + username + " (code=" + code + ")");
            
            // Si estaba en videollamada, notificar a los demás
            if (videoRoomUsers.containsKey(username)) {
                videoRoomUsers.remove(username);
                for (WebSocket c : videoRoomUsers.values()) {
                    if (c.isOpen()) {
                        c.send(json("type", "user_left", "username", username));
                    }
                }
            }
            
            broadcastJson(json("type","userlist","users", currentUsers()));
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        ex.printStackTrace();
    }

    // ==================== Handlers ====================

    private void handleText(WebSocket conn, String json) {
        Map<String,Object> map = gson.fromJson(json,
                new TypeToken<Map<String,Object>>(){}.getType());
        String type = (String) map.get("type");
        if (type == null) {
            conn.send(json("type","error","msg","missing type"));
            return;
        }

        switch (type) {
            case "auth": {
                String username = safeStr(map.get("username"));
                String password = safeStr(map.get("password"));
                if (username.isEmpty() || password.isEmpty()) {
                    conn.send(json("type","auth_fail","msg","empty credentials"));
                    conn.close(1008, "Auth failed");
                    return;
                }
                User u = userDAO.authenticate(username, password); // usa tu DAO actual
                if (u != null) {
                    sessions.put(conn, u);
                    conn.send(json("type","auth_ok","username", u.getUsername()));
                    broadcastJson(json("type","userlist","users", currentUsers()));
                } else {
                    conn.send(json("type","auth_fail","msg","bad credentials"));
                    conn.close(1008, "Auth failed");
                }
                break;
            }

            case "text": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                String content = safeStr(map.get("content"));
                if (content.isEmpty()) return;
                long ts = System.currentTimeMillis();

                // Aquí podrías persistir si quieres: userDAO.saveMessage(u.getUsername(), content, ts);

                // Broadcast en formato JSON para el frontend JS (incluye al remitente)
                broadcastJson(json(
                    "type","text",
                    "from", u.getUsername(),
                    "content", content,
                    "timestamp", ts
                ));
                break;
            }

            case "file": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                
                String filename = safeStr(map.get("filename"));
                String mimetype = safeStr(map.get("mimetype"));
                Object data = map.get("data");
                Object size = map.get("size");
                long ts = System.currentTimeMillis();
                
                if (filename.isEmpty() || data == null) {
                    conn.send(json("type","error","msg","Archivo inválido"));
                    return;
                }
                
                System.out.println("📎 Archivo recibido de " + u.getUsername() + 
                                   ": " + filename + " (" + mimetype + ", " + size + " bytes)");
                
                // Broadcast del archivo a todos EXCEPTO al remitente
                String payload = json(
                    "type", "file",
                    "from", u.getUsername(),
                    "filename", filename,
                    "mimetype", mimetype,
                    "size", size,
                    "data", data,
                    "timestamp", ts
                );
                
                for (WebSocket c : sessions.keySet()) {
                    // Enviar solo si NO es el remitente
                    if (c.isOpen() && c != conn) {
                        c.send(payload);
                    }
                }
                break;
            }

            // ========== Videollamada Grupal ==========
            case "join_room": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                
                String username = u.getUsername();
                
                // Enviar lista de usuarios ya en la sala al nuevo usuario
                List<String> currentRoomUsers = new ArrayList<>(videoRoomUsers.keySet());
                conn.send(json("type", "room_users", "users", currentRoomUsers));
                
                // Agregar usuario a la sala
                videoRoomUsers.put(username, conn);
                
                // Notificar a todos los demás que un nuevo usuario se unió
                for (Map.Entry<String, WebSocket> entry : videoRoomUsers.entrySet()) {
                    if (!entry.getKey().equals(username) && entry.getValue().isOpen()) {
                        entry.getValue().send(json("type", "user_joined", "username", username));
                    }
                }
                
                System.out.println("📹 " + username + " se unió a la videollamada. Total: " + videoRoomUsers.size());
                break;
            }

            case "leave_room": {
                User u = sessions.get(conn);
                if (u == null) return;
                
                String username = u.getUsername();
                videoRoomUsers.remove(username);
                
                // Notificar a todos que el usuario salió
                for (WebSocket c : videoRoomUsers.values()) {
                    if (c.isOpen()) {
                        c.send(json("type", "user_left", "username", username));
                    }
                }
                
                System.out.println("📹 " + username + " salió de la videollamada. Total: " + videoRoomUsers.size());
                break;
            }

            case "webrtc_offer": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                
                String to = safeStr(map.get("to"));
                Object offer = map.get("offer");
                
                WebSocket targetConn = videoRoomUsers.get(to);
                if (targetConn != null && targetConn.isOpen()) {
                    targetConn.send(json(
                        "type", "webrtc_offer",
                        "from", u.getUsername(),
                        "offer", offer
                    ));
                }
                break;
            }

            case "webrtc_answer": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                
                String to = safeStr(map.get("to"));
                Object answer = map.get("answer");
                
                WebSocket targetConn = videoRoomUsers.get(to);
                if (targetConn != null && targetConn.isOpen()) {
                    targetConn.send(json(
                        "type", "webrtc_answer",
                        "from", u.getUsername(),
                        "answer", answer
                    ));
                }
                break;
            }

            case "webrtc_ice": {
                User u = sessions.get(conn);
                if (u == null) { conn.close(1008,"Not authed"); return; }
                
                String to = safeStr(map.get("to"));
                Object candidate = map.get("candidate");
                
                WebSocket targetConn = videoRoomUsers.get(to);
                if (targetConn != null && targetConn.isOpen()) {
                    targetConn.send(json(
                        "type", "webrtc_ice",
                        "from", u.getUsername(),
                        "candidate", candidate
                    ));
                }
                break;
            }

            case "logout": {
                conn.close(1000, "bye");
                break;
            }

            default:
                conn.send(json("type","error","msg","unknown type: " + type));
        }
    }

    private void handleBinary(WebSocket conn, ByteBuffer bytes) {
        User u = sessions.get(conn);
        if (u == null) { conn.close(1008,"Not authed"); return; }
        // Versión simple: reenvía el binario tal cual a todos los conectados
        for (WebSocket c : sessions.keySet()) {
            if (c.isOpen()) c.send(bytes);
        }
    }

    // ==================== Utilidades ====================

    private String json(Object... kv) {
        Map<String,Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(String.valueOf(kv[i]), kv[i+1]);
        }
        return gson.toJson(m);
    }

    private List<String> currentUsers() {
        ArrayList<String> list = new ArrayList<>();
        for (User u : sessions.values()) list.add(u.getUsername());
        Collections.sort(list);
        return list;
    }

    private void broadcastJson(String payload) {
        for (WebSocket c : sessions.keySet()) if (c.isOpen()) c.send(payload);
    }

    private static String safeStr(Object o) {
        return (o == null) ? "" : String.valueOf(o).trim();
    }
}
