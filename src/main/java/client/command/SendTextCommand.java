package client.command;

import client.core.ClientConnection;
import server.model.TextMessage;

public class SendTextCommand implements Command {
    private final String username;
    private final String text;
    private final ClientConnection connection;

    public SendTextCommand(String username, String text, ClientConnection connection) {
        this.username = username;
        this.text = text;
        this.connection = connection;
    }

    @Override
    public void execute() throws Exception {
        connection.send(new TextMessage(username, text));
    }
}
