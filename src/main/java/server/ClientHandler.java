package server;

import java.io.EOFException;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.Socket;
import java.util.concurrent.atomic.AtomicBoolean;

import server.dao.UserDAO;
import server.model.Message;
import server.model.TextMessage;
import server.model.User;
import server.util.ChatLogger;

public class ClientHandler implements Runnable {
    private Socket socket;
    private ObjectOutputStream out;
    private ObjectInputStream in;
    private ServerController server;
    private User user;
    private AtomicBoolean running = new AtomicBoolean(true);

    public ClientHandler(Socket socket, ServerController server){
        this.socket = socket; this.server = server;
    }

    public String getUsername(){
        return user != null ? user.getUsername() : null;
    }

    public void sendMessage(Message msg){
        try {
            out.writeObject(msg);
            out.flush();
        } catch(IOException e){
            System.err.println("Error enviando a " + getUsername() + ": " + e.getMessage());
            shutdown();
        }
    }

    private boolean handleLogin() throws IOException, ClassNotFoundException {
        // Espera recibir un login o registro
        // Formato: String[] {command, username, password, [fullName]}
        // command: "LOGIN" o "REGISTER"
        Object o = in.readObject();
        if(o instanceof String[]){
            String[] data = (String[]) o;
            if(data.length < 3) {
                sendMessage(new TextMessage("SERVER", "LOGIN_BADFORMAT"));
                return false;
            }
            
            String command = data[0];
            String username = data[1];
            String password = data[2];
            UserDAO dao = new UserDAO();
            
            if("REGISTER".equals(command)) {
                // Registro de nuevo usuario
                String fullName = data.length > 3 ? data[3] : username;
                User u = dao.registerUser(username, fullName, password);
                if(u != null){
                    this.user = u;
                    server.registerClient(this);
                    sendMessage(new TextMessage("SERVER", "REGISTER_SUCCESS"));
                    ChatLogger.getInstance().logLogin(u.getUsername());
                    return true;
                } else {
                    sendMessage(new TextMessage("SERVER", "REGISTER_FAIL"));
                    return false;
                }
            } else if("LOGIN".equals(command)) {
                // Login tradicional
                User u = dao.authenticate(username, password);
                if(u != null){
                    this.user = u;
                    server.registerClient(this);
                    sendMessage(new TextMessage("SERVER", "LOGIN_SUCCESS"));
                    ChatLogger.getInstance().logLogin(u.getUsername());
                    return true;
                } else {
                    sendMessage(new TextMessage("SERVER", "LOGIN_FAIL"));
                    return false;
                }
            } else {
                sendMessage(new TextMessage("SERVER", "LOGIN_BADFORMAT"));
                return false;
            }
        } else {
            sendMessage(new TextMessage("SERVER", "LOGIN_BADFORMAT"));
            return false;
        }
    }

    @Override
    public void run(){
        try {
            out = new ObjectOutputStream(socket.getOutputStream());
            in = new ObjectInputStream(socket.getInputStream());

            // Intentos de login (simple: permitir 3 intentos)
            int tries = 0;
            boolean logged = false;
            while(tries < 3 && !logged){
                if(handleLogin()) logged = true;
                else tries++;
            }
            if(!logged){
                shutdown();
                return;
            }

            // Loop principal: leer mensajes y procesarlos
            while(running.get()){
                Object obj = in.readObject();
                if(obj instanceof Message){
                    Message msg = (Message) obj;
                    // Si message es TextMessage y contiene comando special "LOGOUT" -> desconectar
                    if(msg instanceof TextMessage){
                        TextMessage tm = (TextMessage) msg;
                        if("/logout".equalsIgnoreCase(tm.getText().trim())){
                            sendMessage(new TextMessage("SERVER","BYE"));
                            if (getUsername() != null) {
                                ChatLogger.getInstance().logLogout(getUsername());
                            }
                            shutdown();
                            break;
                        }
                    }
                    server.broadcast(msg); // difundir a todos
                } else {
                    System.out.println("Recibido objeto desconocido: " + obj.getClass());
                }
            }
        } catch (EOFException eof){
            System.out.println("Cliente desconectado (EOF).");
        } catch (Exception e){
            e.printStackTrace();
        } finally {
            shutdown();
        }
    }

    public void shutdown(){
        if(!running.getAndSet(false)) return;
        server.unregisterClient(this);
        try { if(out!=null) out.close(); } catch(Exception e){}
        try { if(in!=null) in.close(); } catch(Exception e){}
        try { if(socket!=null && !socket.isClosed()) socket.close(); } catch(Exception e){}
        System.out.println("Handler for " + getUsername() + " cerrado.");
        if (getUsername() != null) {
            ChatLogger.getInstance().logLogout(getUsername());
        }
    }
}

