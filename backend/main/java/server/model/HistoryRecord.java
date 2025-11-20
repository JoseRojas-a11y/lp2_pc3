package server.model;

/**
 * HistoryRecord - Representa un evento histórico (texto o archivo) ya persistido.
 * Se utiliza para reconstruir el chat cuando un usuario se conecta.
 */
public final class HistoryRecord {
    private final String type; // "text" | "file"
    private final String username; // puede ser null => system
    private final String content; // solo para texto
    private final String filename; // solo para archivo
    private final String mimetype; // solo para archivo
    private final long size;       // solo para archivo
    private final String dataBase64; // solo para archivo
    private final long timestamp; // millis

    private HistoryRecord(String type, String username, String content,
                          String filename, String mimetype, long size,
                          String dataBase64, long timestamp) {
        this.type = type;
        this.username = username;
        this.content = content;
        this.filename = filename;
        this.mimetype = mimetype;
        this.size = size;
        this.dataBase64 = dataBase64;
        this.timestamp = timestamp;
    }

    public static HistoryRecord text(String username, String content, long timestamp) {
        return new HistoryRecord("text", username, content, null, null, 0L, null, timestamp);
    }

    public static HistoryRecord file(String username, String filename, String mimetype, long size, String dataBase64, long timestamp) {
        return new HistoryRecord("file", username, null, filename, mimetype, size, dataBase64, timestamp);
    }

    public String getType() { return type; }
    public String getUsername() { return username; }
    public String getContent() { return content; }
    public String getFilename() { return filename; }
    public String getMimetype() { return mimetype; }
    public long getSize() { return size; }
    public String getDataBase64() { return dataBase64; }
    public long getTimestamp() { return timestamp; }
}