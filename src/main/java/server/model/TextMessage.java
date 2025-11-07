package server.model;

public class TextMessage extends Message {
    private static final long serialVersionUID = 1L;
    private String text;
    public TextMessage(String fromUsername, String text){
        super(fromUsername);
        this.text = text;
    }
    public String getText(){ return text; }
    @Override
    public String toString(){
        return "["+getFromUsername()+"] "+text;
    }
}
