package client.core;

import server.model.*;
import java.net.Socket;
import java.io.*;

public class ClientConnection {
    private Socket socket;
    private ObjectOutputStream out;
    private ObjectInputStream in;
    private volatile boolean running = true;

    public ClientConnection(String host, int port) throws Exception {
        socket = new Socket(host, port);
        out = new ObjectOutputStream(socket.getOutputStream());
        in = new ObjectInputStream(socket.getInputStream());
    }

    public boolean login(String username, String password) throws Exception {
        out.writeObject(new String[]{username, password});
        out.flush();
        Object resp = in.readObject();

        if (resp instanceof TextMessage tm && (username + " se ha unido.").equals(tm.getText())) {
            System.out.println("Login exitoso. Bienvenido " + username);
            return true;
        } else {
            System.out.println("Login falló.");
            return false;
        }
    }

    public Object read() throws Exception {
        return in.readObject();
    }

    public void send(Object o) throws Exception {
        out.writeObject(o);
        out.flush();
    }

    public void shutdown() {
        running = false;
        try { if (out != null) out.close(); } catch (Exception ignored) {}
        try { if (in != null) in.close(); } catch (Exception ignored) {}
        try { if (socket != null && !socket.isClosed()) socket.close(); } catch (Exception ignored) {}
        System.out.println("Conexión cerrada.");
        System.exit(0);
    }

    public boolean isRunning() { return running; }
}
