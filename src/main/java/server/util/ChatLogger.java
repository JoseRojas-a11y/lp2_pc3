package server.util;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.locks.ReentrantLock;

/**
 * ChatLogger - Logger simple para registrar eventos del chat a un archivo .txt
 * Crea un archivo por ejecución en la carpeta logs/ con timestamp.
 */
public final class ChatLogger {
    private static ChatLogger instance;

    private final ReentrantLock lock = new ReentrantLock(true);
    private final Path logDir;
    private final Path logFile;
    private BufferedWriter writer;

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter FILENAME = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    private ChatLogger() throws IOException {
        this.logDir = Paths.get("logs");
        if (!Files.exists(logDir)) {
            Files.createDirectories(logDir);
        }
        String fileName = "chat-" + LocalDateTime.now().format(FILENAME) + ".txt";
        this.logFile = logDir.resolve(fileName);
        this.writer = new BufferedWriter(new OutputStreamWriter(Files.newOutputStream(logFile), StandardCharsets.UTF_8));
        writeLine("=== Servidor iniciado: " + now() + " ===");
    }

    public static synchronized ChatLogger getInstance() {
        if (instance == null) {
            try {
                instance = new ChatLogger();
            } catch (IOException e) {
                throw new RuntimeException("No se pudo inicializar ChatLogger", e);
            }
        }
        return instance;
    }

    private String now() {
        return LocalDateTime.now().format(TS);
    }

    private void writeLine(String line) {
        lock.lock();
        try {
            writer.write(line);
            writer.newLine();
            writer.flush();
        } catch (IOException e) {
            // Como último recurso, imprimir a consola
            System.err.println("[ChatLogger] Error escribiendo log: " + e.getMessage());
        } finally {
            lock.unlock();
        }
    }

    // API de logging semántico
    public void logInfo(String msg) { writeLine("[" + now() + "] INFO  - " + msg); }
    public void logError(String msg) { writeLine("[" + now() + "] ERROR - " + msg); }

    public void logLogin(String username) { writeLine("[" + now() + "] LOGIN  - " + username + " ingresó"); }
    public void logLogout(String username) { writeLine("[" + now() + "] LOGOUT - " + username + " salió"); }

    public void logText(String from, String content) {
        writeLine("[" + now() + "] MSG    - " + from + ": " + content);
    }

    public void logFile(String from, String filename) {
        writeLine("[" + now() + "] FILE   - " + from + ": Se envió " + filename);
    }

    public void logVideoStart() { writeLine("[" + now() + "] VIDEO  - Videollamada iniciada"); }
    public void logVideoEnd() { writeLine("[" + now() + "] VIDEO  - Videollamada finalizada"); }
    public void logVideoJoin(String username) { writeLine("[" + now() + "] VIDEO  - " + username + " se unió a la videollamada"); }
    public void logVideoLeave(String username) { writeLine("[" + now() + "] VIDEO  - " + username + " salió de la videollamada"); }

    public synchronized void close() {
        lock.lock();
        try {
            if (writer != null) {
                writeLine("=== Servidor detenido: " + now() + " ===");
                writer.flush();
                writer.close();
                writer = null;
            }
        } catch (IOException e) {
            System.err.println("[ChatLogger] Error cerrando log: " + e.getMessage());
        } finally {
            lock.unlock();
        }
    }
}
