// src/server/MainServer.java
package server;

import java.sql.Connection;
import java.sql.SQLException;

import server.dao.DBConnection;
import server.service.AuditService;

public class MainServer {
    public static void main(String[] args){
        int portWS  = Config.getWsPort();

        // Inicializar auditoría y registrar shutdown hook
        AuditService audit = new AuditService();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            audit.recordSystem("Servidor apagándose (shutdown hook)");
            audit.recordSystem("Servidor detenido");
        }));

        // Probar conexión a BD antes de iniciar servidor WS
        try (Connection conn = DBConnection.getInstance().getConnection()) {
            audit.recordSystem("Conexión a BD OK: " + conn.getMetaData().getURL());
        } catch (SQLException e) {
            audit.recordSystem("ERROR - Fallo conectando a BD: " + e.getMessage());
            System.err.println("No se pudo establecer conexión a la base de datos. Abortando inicio de WebSocket.");
            return;
        }

        // Arrancar WebSocket en un hilo separado
        new Thread(() -> {
            ChatWebSocketServer wsServer = new ChatWebSocketServer(portWS);
            wsServer.start();
            String wsUrl = "ws://" + Config.getHost() + ":" + portWS + "/";
            System.out.println("WebSocket activo en " + wsUrl);
            audit.recordSystem("WebSocket activo en puerto " + portWS);
        }).start();
    }
}
