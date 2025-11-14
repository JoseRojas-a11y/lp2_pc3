// src/server/MainServer.java
package server;

import java.sql.Connection;
import java.sql.SQLException;

import server.dao.DBConnection;
import server.util.ChatLogger;

public class MainServer {
    public static void main(String[] args){
        int portWS  = Config.getWsPort();

        // Inicializar logger y registrar shutdown hook
        ChatLogger logger = ChatLogger.getInstance();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            logger.logInfo("Servidor apagándose (shutdown hook)");
            logger.close();
        }));

        // Probar conexión a BD antes de iniciar servidor WS
        try (Connection conn = DBConnection.getInstance().getConnection()) {
            logger.logInfo("Conexión a BD OK: " + conn.getMetaData().getURL());
        } catch (SQLException e) {
            logger.logError("Fallo conectando a BD: " + e.getMessage());
            System.err.println("No se pudo establecer conexión a la base de datos. Abortando inicio de WebSocket.");
            return;
        }

        // Arrancar WebSocket en un hilo separado
        new Thread(() -> {
            ChatWebSocketServer wsServer = new ChatWebSocketServer(portWS);
            wsServer.start();
            String wsUrl = "ws://" + Config.getHost() + ":" + portWS + "/";
            System.out.println("WebSocket activo en " + wsUrl);
            ChatLogger.getInstance().logInfo("WebSocket activo en puerto " + portWS);
        }).start();
    }
}
