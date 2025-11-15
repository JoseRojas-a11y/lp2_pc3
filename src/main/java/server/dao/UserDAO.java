package server.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import server.model.User;

/**
 * UserDAO - Implementación stateless. Cada método abre y cierra su propia Connection
 * usando try-with-resources. El antiguo enfoque Singleton aquí no aporta valor porque
 * no existe estado compartido; se evita así proliferación innecesaria de instancias
 * y se favorece inyección explícita donde se necesite.
 */
public final class UserDAO {

    public User authenticate(String username, String passwordPlain) {
        if (username == null || passwordPlain == null) return null;
        String sql = "SELECT id, username, full_name, password_hash FROM users WHERE username = ?";
        
        try (Connection c = DBConnection.getInstance().getConnection();
            PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, username);
            
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String stored = rs.getString("password_hash");
                    if (stored != null && stored.equals(passwordPlain)) {
                        return new User(rs.getInt("id"), rs.getString("username"), rs.getString("full_name"));
                    }
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error autenticando usuario: " + username, e);
        }
        return null;
    }

    /**
     * Registra un nuevo usuario si el username no existe.
     * Devuelve la entidad creada o null si el username ya está en uso.
     */
    public User registerUser(String username, String fullName, String passwordPlain) {
        if (username == null || passwordPlain == null || username.isBlank() || passwordPlain.isBlank()) return null;
        String checkSql = "SELECT id FROM users WHERE username = ?";
        String insertSql = "INSERT INTO users (username, full_name, password_hash) VALUES (?,?,?)";
        try (Connection c = DBConnection.getInstance().getConnection();
             PreparedStatement checkPs = c.prepareStatement(checkSql)) {
            checkPs.setString(1, username);
            try (ResultSet rs = checkPs.executeQuery()) {
                if (rs.next()) return null; // existe
            }
            try (PreparedStatement insertPs = c.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
                insertPs.setString(1, username);
                insertPs.setString(2, fullName);
                insertPs.setString(3, passwordPlain); // TODO: hash seguro
                int affected = insertPs.executeUpdate();
                if (affected > 0) {
                    try (ResultSet gen = insertPs.getGeneratedKeys()) {
                        if (gen.next()) {
                            return new User(gen.getInt(1), username, fullName);
                        }
                    }
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error registrando usuario: " + username, e);
        }
        return null;
    }
}
