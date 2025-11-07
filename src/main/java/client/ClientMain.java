package client;

import server.model.*;
import java.net.Socket;
import java.io.*;
import java.util.Scanner;

public class ClientMain {
    private Socket socket;
    private ObjectOutputStream out;
    private ObjectInputStream in;
    private volatile boolean running = true;

    public ClientMain(String host, int port) throws Exception {
        socket = new Socket(host, port);
        out = new ObjectOutputStream(socket.getOutputStream());
        in = new ObjectInputStream(socket.getInputStream());
    }

    public void start(String username, String password) throws Exception {
        // Enviar login como String[] {user, pass}
        out.writeObject(new String[]{username, password});
        out.flush();

        // Leer respuesta de login
        Object resp = in.readObject();
        if(resp instanceof TextMessage){
            TextMessage tm = (TextMessage) resp;
            if((username + " se ha unido.").equals(tm.getText())){
                System.out.println("Login exitoso. Bienvenido " + username);
            } else {
                System.out.println("Login falló: " + tm.getText());
                shutdown();
                return;
            }
        } else {
            System.out.println("Respuesta no válida del servidor.");
            shutdown();
            return;
        }

        // Thread receptor
        Thread reader = new Thread(() -> {
            try {
                while(running){
                    Object o = in.readObject();
                    if(o instanceof Message){
                        Message m = (Message) o;
                        if(m instanceof TextMessage){
                            System.out.println(((TextMessage)m).toString());
                        } else if(m instanceof FileMessage){
                            try {
                                FileMessage fm = (FileMessage) m;
                                String outName = "recv_" + fm.getFilename();
                                try (FileOutputStream fos = new FileOutputStream(outName)) {
                                    fos.write(fm.getFileData());
                                }
                                System.out.println("[Archivo recibido] " + fm.getFilename() + " guardado como " + outName);
                            } catch(Exception ex){ ex.printStackTrace(); }
                        }
                    }
                }
            } catch(Exception e){
                if(running) e.printStackTrace();
            }
        });
        reader.start();

        // Thread escritor (interacción console)
        Scanner sc = new Scanner(System.in);
        System.out.println("Escribe mensajes. Comando /sendfile <ruta> para enviar archivo. /logout para salir.");
        while(running){
            String line = sc.nextLine();
            if(line.startsWith("/sendfile ")){
                String path = line.substring(10).trim();
                File f = new File(path);
                if(!f.exists()){
                    System.out.println("Archivo no encontrado: " + path);
                    continue;
                }
                byte[] data = new byte[(int) f.length()];
                try(FileInputStream fis = new FileInputStream(f)){
                    int read = fis.read(data);
                }
                FileMessage fm = new FileMessage(username, f.getName(), data);
                out.writeObject(fm);
                out.flush();
                System.out.println("Archivo enviado: " + f.getName());
            } else if("/logout".equalsIgnoreCase(line.trim())){
                TextMessage tm = new TextMessage(username, "/logout");
                out.writeObject(tm);
                out.flush();
                shutdown();
            } else {
                TextMessage tm = new TextMessage(username, line);
                out.writeObject(tm);
                out.flush();
            }
        }
    }

    public void shutdown(){
        running = false;
        try { if(out!=null) out.close(); } catch(Exception e){}
        try { if(in!=null) in.close(); } catch(Exception e){}
        try { if(socket!=null && !socket.isClosed()) socket.close(); } catch(Exception e){}
        System.out.println("Conexión cerrada.");
        System.exit(0);
    }

    public static void main(String[] args) throws Exception {
        String host = "10.73.5.105"; 
        
        int port = 5340;        
        ClientMain client = new ClientMain(host, port);
        Scanner sc = new Scanner(System.in);
        System.out.print("Usuario: "); String u = sc.nextLine();
        System.out.print("Password: "); String p = sc.nextLine();
        client.start(u, p);
    }
}
