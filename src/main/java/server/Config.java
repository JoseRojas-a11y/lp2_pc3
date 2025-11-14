package server;

/**
 * Configuración centralizada de host y puertos.
 * Permite cambiar IP y puertos desde variables de entorno sin tocar el código:
 *  JAVA_HOST, JAVA_TCP_PORT, JAVA_WS_PORT
 */
public final class Config {
    private static final String DEFAULT_HOST = "localhost"; // Cambiar aquí si se desea un valor por defecto distinto
    private static final int DEFAULT_WS_PORT  = 8081;

    private static final String HOST_VALUE;
    private static final int WS_PORT_VALUE;

    static {
    HOST_VALUE = getenvOrDefault("JAVA_HOST", DEFAULT_HOST);
    WS_PORT_VALUE  = parsePort(getenvOrDefault("JAVA_WS_PORT", String.valueOf(DEFAULT_WS_PORT)), DEFAULT_WS_PORT);
    }

    private Config() {}

    private static String getenvOrDefault(String key, String def) {
        String v = System.getenv(key);
        return (v == null || v.isBlank()) ? def : v.trim();
    }

    private static int parsePort(String raw, int def) {
        if (raw == null) return def;
        try {
            int p = Integer.parseInt(raw.trim());
            return (p > 0 && p < 65536) ? p : def;
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public static String getHost() { return HOST_VALUE; }
    public static int getWsPort()  { return WS_PORT_VALUE; }

    /** Devuelve la URL base para WebSocket (sin path final). */
    public static String getWebSocketBaseUrl() {
        return "ws://" + HOST_VALUE + ":" + WS_PORT_VALUE + "/";
    }
}
