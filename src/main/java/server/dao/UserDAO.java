package server.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import server.model.User;

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

    /**
     * Registra un nuevo usuario en la base de datos
     * @param username Nombre de usuario único
     * @param fullName Nombre completo del usuario
     * @param passwordPlain Contraseña en texto plano (en producción usar hash)
     * @return User si el registro fue exitoso, null si falló
     */
    public User registerUser(String username, String fullName, String passwordPlain) {
        try {
            Connection c = DBConnection.getInstance().getConnection();
            
            // Verificar si el usuario ya existe
            String checkSql = "SELECT id FROM users WHERE username = ?";
            PreparedStatement checkPs = c.prepareStatement(checkSql);
            checkPs.setString(1, username);
            ResultSet rs = checkPs.executeQuery();
            
            if(rs.next()) {
                // Usuario ya existe
                return null;
            }
            
            // Insertar nuevo usuario
            String insertSql = "INSERT INTO users (username, full_name, password_hash) VALUES (?, ?, ?)";
            PreparedStatement insertPs = c.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            insertPs.setString(1, username);
            insertPs.setString(2, fullName);
            insertPs.setString(3, passwordPlain); // En producción: hashear la contraseña
            
            int affectedRows = insertPs.executeUpdate();
            
            if(affectedRows > 0) {
                ResultSet generatedKeys = insertPs.getGeneratedKeys();
                if(generatedKeys.next()) {
                    int userId = generatedKeys.getInt(1);
                    return new User(userId, username, fullName);
                }
            }
        } catch(SQLException ex){
            ex.printStackTrace();
        }
        return null;
    }
}
