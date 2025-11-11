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
            System.out.println("WS cerrado: " + u.getUsername() + " (code=" + code + ")");
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

                // Broadcast en formato JSON para el frontend JS
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
                
                // Broadcast del archivo con todos sus metadatos
                broadcastJson(json(
                    "type", "file",
                    "from", u.getUsername(),
                    "filename", filename,
                    "mimetype", mimetype,
                    "size", size,
                    "data", data,
                    "timestamp", ts
                ));
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
