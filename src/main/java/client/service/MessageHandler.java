package client.service;

import client.core.ClientConnection;
import server.model.*;

public class MessageHandler {
    private final ClientConnection connection;

    public MessageHandler(ClientConnection connection) {
        this.connection = connection;
    }

    public void listen() {
        try {
            while (connection.isRunning()) {
                Object o = connection.read();
                if (o instanceof TextMessage tm) {
                    System.out.println(tm.toString());
                } else if (o instanceof FileMessage fm) {
                    String output = "recv_" + fm.getFilename();
                    FileService.saveFile(output, fm.getFileData());
                    System.out.println("[Archivo recibido] " + fm.getFilename() + " guardado como " + output);
                }
            }
        } catch (Exception e) {
            if (connection.isRunning()) e.printStackTrace();
        }
    }
}
