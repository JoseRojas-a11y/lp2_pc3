package client.command;

import client.core.ClientConnection;
import client.service.FileService;
import server.model.FileMessage;

import java.io.File;

public class SendFileCommand implements Command {
    private final String username;
    private final String filePath;
    private final ClientConnection connection;

    public SendFileCommand(String username, String filePath, ClientConnection connection) {
        this.username = username;
        this.filePath = filePath;
        this.connection = connection;
    }

    @Override
    public void execute() throws Exception {
        File file = new File(filePath);
        byte[] data = FileService.readFile(file);
        connection.send(new FileMessage(username, file.getName(), data));
        System.out.println("Archivo enviado: " + file.getName());
    }
}
