package server.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * ActionDAO - Acceso stateless a acciones y sus detalles.
 * Cada método abre/cierra su propia Connection desde DBConnection/DataSource.
 */
public final class ActionDAO {

    public Integer getUserIdByUsername(String username) {
        if (username == null || username.isBlank()) return null;
        final String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection c = DBConnection.getInstance().getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getInt(1);
            }
        } catch (SQLException e) {
            return null;
        }
        return null;
    }

    public long insertAction(String actionType, String room, Integer actorUserId, boolean serverGenerated) {
        final String sql = "INSERT INTO actions(action_type, room, actor_user_id, server_generated) VALUES (?,?,?,?)";
        try (Connection c = DBConnection.getInstance().getConnection();
             PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, actionType);
            ps.setString(2, room != null ? room : "global");
            if (actorUserId == null) ps.setNull(3, java.sql.Types.INTEGER); else ps.setInt(3, actorUserId);
            ps.setBoolean(4, serverGenerated);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getLong(1);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error insertando acción: " + actionType, e);
        }
        throw new RuntimeException("No se obtuvo id de acción generada");
    }

    public void insertTextDetails(long actionId, String content) {
        final String sql = "INSERT INTO action_text_details(action_id, content, content_length) VALUES (?,?,?)";
        String text = content != null ? content : "";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, actionId);
            ps.setString(2, text);
            ps.setInt(3, text.length());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Error insertando detalles de texto", e);
        }
    }

    public void insertFileDetails(long actionId, String filename, String mimetype, long size, byte[] data) {
        final String sql = "INSERT INTO action_file_details(action_id, filename, mimetype, size, data) VALUES (?,?,?,?,?)";
        try (Connection c = DBConnection.getInstance().getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, actionId);
            ps.setString(2, filename != null ? filename : "");
            ps.setString(3, mimetype != null ? mimetype : "application/octet-stream");
            ps.setLong(4, size);
            ps.setBytes(5, data != null ? data : new byte[0]);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Error insertando detalles de archivo", e);
        }
    }
}
