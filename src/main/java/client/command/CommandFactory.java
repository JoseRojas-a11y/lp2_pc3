package client.command;

import client.core.ClientConnection;

public class CommandFactory {
    public static Command create(String input, String username, ClientConnection connection) {
        if (input.startsWith("/sendfile ")) {
            String path = input.substring(10).trim();
            return new SendFileCommand(username, path, connection);
        } else if ("/logout".equalsIgnoreCase(input.trim())) {
            return new LogoutCommand(username, connection);
        } else if (!input.isBlank()) {
            return new SendTextCommand(username, input, connection);
        }
        return null;
    }
}
