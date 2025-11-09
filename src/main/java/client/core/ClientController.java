package client.core;

import client.command.*;
import client.service.*;
import client.util.ConsoleReader;
import server.model.*;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ClientController {
    private final ClientConnection connection;
    private final MessageHandler messageHandler;
    private final ConsoleReader consoleReader;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public ClientController(String host, int port) throws Exception {
        this.connection = new ClientConnection(host, port);
        this.messageHandler = new MessageHandler(connection);
        this.consoleReader = new ConsoleReader();
    }

    public void start(String username, String password) throws Exception {
        if (!connection.login(username, password)) {
            System.out.println("Error de login.");
            connection.shutdown();
            return;
        }

        System.out.println("Escribe mensajes. Usa /sendfile <ruta> o /logout para salir.");
        executor.submit(() -> messageHandler.listen());

        while (connection.isRunning()) {
            String input = consoleReader.nextLine();
            Command cmd = CommandFactory.create(input, username, connection);
            if (cmd != null) cmd.execute();
        }
    }
}
