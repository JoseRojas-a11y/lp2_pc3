// src/server/model/User.java
package server.model;

public class User implements java.io.Serializable {
    private static final long serialVersionUID = 1L;
    private int id;
    private String username;
    private String fullName;
    public User(int id, String username, String fullName){
        this.id = id; this.username = username; this.fullName = fullName;
    }
    public int getId(){ return id; }
    public String getUsername(){ return username; }
    public String getFullName(){ return fullName; }
}