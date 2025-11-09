package client.command;

import client.core.ClientConnection;
import server.model.TextMessage;

public class LogoutCommand implements Command {
    private final String username;
    private final ClientConnection connection;

    public LogoutCommand(String username, ClientConnection connection) {
        this.username = username;
        this.connection = connection;
    }

    @Override
    public void execute() throws Exception {
        connection.send(new TextMessage(username, "/logout"));
        connection.shutdown();
    }
}
