package server.dao;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import com.mysql.cj.jdbc.MysqlDataSource;

/**
 * DBConnection - Singleton que expone un DataSource para obtener conexiones independientes.
 * Evita compartir una única Connection entre múltiples hilos (patrón anterior), lo que generaba
 * necesidad de sincronizar y podía causar bloqueos. Cada llamada a getConnection() devuelve
 * una nueva conexión del pool interno básico de MysqlDataSource.
 *
 * Variables de entorno soportadas:
 *  DB_HOST (default: localhost)
 *  DB_PORT (default: 3306)
 *  DB_NAME (default: chatapp)
 *  DB_USER (default: root)
 *  DB_PASS (default: cambiar_me)
 */
public final class DBConnection {
    private static volatile DBConnection instance;
    private final DataSource dataSource;

    private DBConnection() {
        MysqlDataSource ds = new MysqlDataSource();
        String host = getenvOrDefault("DB_HOST", "localhost");
        String port = getenvOrDefault("DB_PORT", "3306");
        String db   = getenvOrDefault("DB_NAME", "chatapp");
        String user = getenvOrDefault("DB_USER", "root");
        String pass = getenvOrDefault("DB_PASS", "JoSeSiTo%_10");
        String url = "jdbc:mysql://" + host + ":" + port + "/" + db + "?useSSL=false&serverTimezone=UTC";
        ds.setURL(url);
        ds.setUser(user);
        ds.setPassword(pass);
        this.dataSource = ds;
    }

    public static DBConnection getInstance() {
        DBConnection local = instance;
        if (local == null) {
            synchronized (DBConnection.class) {
                local = instance;
                if (local == null) {
                    instance = local = new DBConnection();
                }
            }
        }
        return local;
    }

    /** Obtiene una nueva Connection. El llamador debe cerrarla (try-with-resources). */
    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    private static String getenvOrDefault(String k, String def) {
        String v = System.getenv(k);
        return (v == null || v.isBlank()) ? def : v.trim();
    }
}
