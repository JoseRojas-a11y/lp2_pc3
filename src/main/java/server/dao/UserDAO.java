package server.dao;

import server.model.User;
import java.sql.*;

public class UserDAO {
    public User authenticate(String username, String passwordPlain) {
        // Nota: en producción usar hash+salt; aquí se compara plain para demo.
        try {
            Connection c = DBConnection.getInstance().getConnection();
            String sql = "SELECT id, username, full_name, password_hash FROM users WHERE username = ?";
            PreparedStatement ps = c.prepareStatement(sql);
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                String stored = rs.getString("password_hash");
                if(stored != null && stored.equals(passwordPlain)){
                    return new User(rs.getInt("id"), rs.getString("username"), rs.getString("full_name"));
                }
            }
        } catch(SQLException ex){
            ex.printStackTrace();
        }
        return null;
    }
}
