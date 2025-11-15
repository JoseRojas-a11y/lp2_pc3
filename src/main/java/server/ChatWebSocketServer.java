package server;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import server.dao.ActionDAO;
import server.dao.UserDAO;
import server.model.User;
import server.service.AuditService;
import server.service.MessageContext;
import server.service.MessageDispatcher;
import server.service.handlers.AuthHandler;
import server.service.handlers.FileHandler;
import server.service.handlers.JoinRoomHandler;
import server.service.handlers.LeaveRoomHandler;
import server.service.handlers.LogoutHandler;
import server.service.handlers.RegisterHandler;
import server.service.handlers.TextHandler;
import server.service.handlers.WebRTCAnswerHandler;
import server.service.handlers.WebRTCIceHandler;
import server.service.handlers.WebRTCOfferHandler;

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
    private final UserDAO userDAO = new UserDAO();
    private final ActionDAO actionDAO = new ActionDAO();
    private final AuditService auditService = new AuditService();
    private MessageDispatcher dispatcher;
    private MessageContext messageContext;

    public ChatWebSocketServer(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server ON ws://" + Config.getHost() + ":" + getPort() + "/");
        setConnectionLostTimeout(30);
        auditService.recordSystem("WebSocket server ON puerto " + getPort());
        // Inicializar contexto y dispatcher (Open/Closed: agregar handler sin tocar servidor)
        this.messageContext = new MessageContext(sessions, videoRoomUsers, userDAO, actionDAO, auditService, gson);
        this.dispatcher = new MessageDispatcher()
            .register(new AuthHandler())
            .register(new RegisterHandler())
            .register(new TextHandler())
            .register(new FileHandler())
            .register(new JoinRoomHandler())
            .register(new LeaveRoomHandler())
            .register(new WebRTCOfferHandler())
            .register(new WebRTCAnswerHandler())
            .register(new WebRTCIceHandler())
            .register(new LogoutHandler());
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Nueva conexión WS: " + conn.getRemoteSocketAddress());
        // Aún no autenticado: esperamos type=auth
        auditService.recordSystem("Nueva conexión WS: " + conn.getRemoteSocketAddress());
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
            auditService.recordLogout(username);
            if (videoRoomUsers.containsKey(username)) {
                videoRoomUsers.remove(username);
                auditService.recordVideoLeave(username);
                for (WebSocket c : videoRoomUsers.values()) {
                    if (c.isOpen()) c.send(messageContext.json("type","user_left","username",username));
                }
                if (videoRoomUsers.isEmpty()) auditService.recordSystem("Videollamada finalizada");
            }
            // Broadcast nueva lista de usuarios
            messageContext.broadcast(messageContext.json("type","userlist","users", messageContext.currentUsers()));
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        auditService.recordSystem("ERROR - WS error: " + ex.getMessage());
    }

    private void handleText(WebSocket conn, String rawJson) {
        Map<String,Object> map = gson.fromJson(rawJson,new TypeToken<Map<String,Object>>(){}.getType());
        String type = (String) map.get("type");
        if (type == null) {
            conn.send(messageContext.json("type","error","msg","missing type"));
            return;
        }
        dispatcher.dispatch(messageContext, conn, type, map);
    }

    private void handleBinary(WebSocket conn, ByteBuffer bytes) {
        User u = sessions.get(conn);
        if (u == null) { 
            conn.close(1008,"Not authed"); 
            return; 
        }
        for (WebSocket c : sessions.keySet()) {
            if (c.isOpen()) c.send(bytes);
        }
    }
}
