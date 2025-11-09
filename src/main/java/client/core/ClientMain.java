package client.core;

import java.util.Scanner;

public class ClientMain {
    public static void main(String[] args) throws Exception {
        String host = "10.73.5.105";
        int port = 5340;

        Scanner sc = new Scanner(System.in);
        System.out.print("Usuario: ");
        String username = sc.nextLine();
        System.out.print("Password: ");
        String password = sc.nextLine();

        ClientController controller = new ClientController(host, port);
        controller.start(username, password);
    }
}