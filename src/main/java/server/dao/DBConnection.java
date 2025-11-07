package server.dao;

import java.sql.*;

public class DBConnection {
    private static DBConnection instance;
    private Connection conn;

    private DBConnection() throws SQLException {
        // Ajusta URL, usuario, pass
        String url = "jdbc:mysql://localhost:3306/chatapp?useSSL=false&serverTimezone=UTC";
        String user = "root";
        String pass = "JoSeSiTo%_10";
        conn = DriverManager.getConnection(url, user, pass);
    }

    public static synchronized DBConnection getInstance() throws SQLException {
        if(instance == null) instance = new DBConnection();
        return instance;
    }
    public Connection getConnection(){ return conn; }
}
