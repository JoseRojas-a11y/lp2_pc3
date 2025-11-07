// src/server/MainServer.java
package server;
import java.net.ServerSocket;
import java.net.Socket;
import java.io.IOException;

public class MainServer {
    public static void main(String[] args){
        
        int port = 5340;
        ServerController controller = new ServerController();
        try (ServerSocket serverSocket = new ServerSocket(port)){
            System.out.println("Servidor escuchando en puerto " + port);
            
            while(true){
                Socket clientSocket = serverSocket.accept();
                System.out.println("Nueva conexión: " + clientSocket.getRemoteSocketAddress());
                
                ClientHandler handler = new ClientHandler(clientSocket, controller);
                Thread t = new Thread(handler);
                t.start();
            }
            
        } catch(IOException e){
            e.printStackTrace();
        }
    }
}
