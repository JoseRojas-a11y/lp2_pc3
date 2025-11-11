// src/server/MainServer.java
package server;

import java.net.ServerSocket;
import java.net.Socket;
import java.io.IOException;
import server.dao.UserDAO;

public class MainServer {
    public static void main(String[] args){
        int portTCP = 5340;
        int portWS  = 8081;

        ServerController controller = new ServerController();

        // Arrancar WebSocket en un hilo separado
        new Thread(() -> {
            ChatWebSocketServer wsServer = new ChatWebSocketServer(portWS, new UserDAO());
            wsServer.start();
            System.out.println("WebSocket activo en ws://10.159.125.105:" + portWS);
        }).start();

        // Servidor TCP tradicional
        try (ServerSocket serverSocket = new ServerSocket(portTCP)){
            System.out.println("Servidor TCP escuchando en puerto " + portTCP);

            while(true){
                Socket clientSocket = serverSocket.accept();
                System.out.println("Nueva conexión TCP: " + clientSocket.getRemoteSocketAddress());

                ClientHandler handler = new ClientHandler(clientSocket, controller);
                new Thread(handler).start();
            }

        } catch(IOException e){
            e.printStackTrace();
        }
    }
}
