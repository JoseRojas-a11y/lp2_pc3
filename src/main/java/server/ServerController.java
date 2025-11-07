package server;

import server.model.Message;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

public class ServerController {
    private final List<ClientHandler> clients = new CopyOnWriteArrayList<>();
    
    public void registerClient(ClientHandler ch){
        clients.add(ch);
        broadcast(new server.model.TextMessage("SERVER", ch.getUsername() + " se ha unido."));
        System.out.println("Cliente registrado: " + ch.getUsername());
    }
    
    public void unregisterClient(ClientHandler ch){
        clients.remove(ch);
        if(ch.getUsername() != null) broadcast(new server.model.TextMessage("SERVER", ch.getUsername() + " se ha ido."));
    }
    
    public void broadcast(Message msg){
        for(ClientHandler ch : clients){
            try{ ch.sendMessage(msg); } catch(Exception e){ e.printStackTrace();}
        }
    }
    
    public int getClientCount(){ return clients.size(); }
}
