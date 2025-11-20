package server.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import server.model.HistoryRecord;

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

    /**
     * Recupera historial reciente de mensajes (TEXT y FILE) para la sala global.
     * @param limit máximo de registros (orden cronológico ascendente)
     */
    public List<HistoryRecord> getRecentHistory(int limit) {
        int lim = (limit <= 0 || limit > 1000) ? 200 : limit; // salvaguarda
        final String sql = "SELECT a.action_type, a.created_at, u.username, t.content, f.filename, f.mimetype, f.size, f.data " +
                "FROM actions a " +
                "LEFT JOIN users u ON u.id=a.actor_user_id " +
                "LEFT JOIN action_text_details t ON t.action_id=a.id " +
                "LEFT JOIN action_file_details f ON f.action_id=a.id " +
                "WHERE a.room = ? AND a.action_type IN ('TEXT','FILE') " +
                "ORDER BY a.created_at ASC LIMIT ?";
        ArrayList<HistoryRecord> list = new ArrayList<>();
        try (Connection c = DBConnection.getInstance().getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, "global");
            ps.setInt(2, lim);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String type = rs.getString("action_type");
                    Timestamp ts = rs.getTimestamp("created_at");
                    long millis = ts != null ? ts.getTime() : System.currentTimeMillis();
                    String username = rs.getString("username");
                    if ("TEXT".equals(type)) {
                        String content = rs.getString("content");
                        list.add(HistoryRecord.text(username, content, millis));
                    } else if ("FILE".equals(type)) {
                        String filename = rs.getString("filename");
                        String mimetype = rs.getString("mimetype");
                        long size = rs.getLong("size");
                        byte[] data = rs.getBytes("data");
                        String b64 = (data != null && data.length > 0) ? Base64.getEncoder().encodeToString(data) : "";
                        list.add(HistoryRecord.file(username, filename, mimetype, size, b64, millis));
                    }
                }
            }
        } catch (SQLException e) {
            // en caso de error se devuelve lo acumulado (posiblemente vacío)
        }
        return list;
    }
}
