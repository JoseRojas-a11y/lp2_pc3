package server.model;
import java.io.Serializable;

public abstract class Message implements Serializable {
    private static final long serialVersionUID = 1L;
    private String fromUsername;
    private long timestamp = System.currentTimeMillis();

    public Message(String fromUsername) {
        this.fromUsername = fromUsername;
    }
    public String getFromUsername(){ return fromUsername; }
    public long getTimestamp(){ return timestamp; }
}
