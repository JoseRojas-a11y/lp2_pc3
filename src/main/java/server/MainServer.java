// src/server/MainServer.java
package server;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

import server.dao.UserDAO;
import server.util.ChatLogger;

public class MainServer {
    public static void main(String[] args){
    int portTCP = Config.getTcpPort();
    int portWS  = Config.getWsPort();

        ServerController controller = new ServerController();

        // Inicializar logger y registrar shutdown hook
        ChatLogger logger = ChatLogger.getInstance();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            logger.logInfo("Servidor apagándose (shutdown hook)");
            logger.close();
        }));

        // Arrancar WebSocket en un hilo separado
        new Thread(() -> {
            ChatWebSocketServer wsServer = new ChatWebSocketServer(portWS, new UserDAO());
            wsServer.start();
            String wsUrl = "ws://" + Config.getHost() + ":" + portWS + "/";
            System.out.println("WebSocket activo en " + wsUrl);
            ChatLogger.getInstance().logInfo("WebSocket activo en puerto " + portWS);
        }).start();

        // Servidor TCP tradicional
        try (ServerSocket serverSocket = new ServerSocket(portTCP)){
            System.out.println("Servidor TCP escuchando en puerto " + portTCP);
            ChatLogger.getInstance().logInfo("Servidor TCP escuchando en puerto " + portTCP);

            while(true){
                Socket clientSocket = serverSocket.accept();
                System.out.println("Nueva conexión TCP: " + clientSocket.getRemoteSocketAddress());
                ChatLogger.getInstance().logInfo("Nueva conexión TCP: " + clientSocket.getRemoteSocketAddress());

                ClientHandler handler = new ClientHandler(clientSocket, controller);
                new Thread(handler).start();
            }

        } catch(IOException e){
            ChatLogger.getInstance().logError("Error en servidor TCP: " + e.getMessage());
        }
    }
}
