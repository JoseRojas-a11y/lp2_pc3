package server.util;

import java.util.concurrent.locks.ReentrantLock;

import server.dao.ActionDAO;

/**
 * ChatLogger - Adaptado para registrar eventos en base de datos (tabla actions y detalles),
 * en lugar de archivos .txt en logs/. Conserva la API pública para minimizar cambios.
 */
public final class ChatLogger {
    private static ChatLogger instance;
    private final ReentrantLock lock = new ReentrantLock(true);
    private final ActionDAO actionDAO;

    private ChatLogger() {
        this.actionDAO = new ActionDAO();
        // Registrar arranque como acción del sistema
        try {
            lock.lock();
            long id = actionDAO.insertAction("SYSTEM", "global", null, true);
            actionDAO.insertTextDetails(id, "Servidor iniciado");
        } finally {
            lock.unlock();
        }
    }

    public static synchronized ChatLogger getInstance() {
        if (instance == null) {
            instance = new ChatLogger();
        }
        return instance;
    }

    // API de logging semántico
    public void logInfo(String msg) {
        lock.lock();
        try {
            long id = actionDAO.insertAction("SYSTEM", "global", null, true);
            actionDAO.insertTextDetails(id, "INFO - " + (msg == null ? "" : msg));
        } finally {
            lock.unlock();
        }
    }

    public void logError(String msg) {
        lock.lock();
        try {
            long id = actionDAO.insertAction("SYSTEM", "global", null, true);
            actionDAO.insertTextDetails(id, "ERROR - " + (msg == null ? "" : msg));
        } finally {
            lock.unlock();
        }
    }

    public void logLogin(String username) {
        lock.lock();
        try {
            Integer uid = actionDAO.getUserIdByUsername(username);
            actionDAO.insertAction("LOGIN", "global", uid, false);
        } finally {
            lock.unlock();
        }
    }

    public void logLogout(String username) {
        lock.lock();
        try {
            Integer uid = actionDAO.getUserIdByUsername(username);
            actionDAO.insertAction("LOGOUT", "global", uid, false);
        } finally {
            lock.unlock();
        }
    }

    public void logText(String from, String content) {
        lock.lock();
        try {
            Integer uid = actionDAO.getUserIdByUsername(from);
            long id = actionDAO.insertAction("TEXT", "global", uid, false);
            actionDAO.insertTextDetails(id, content);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Nota: para archivos se recomienda persistir bytes/mimetype desde el punto de recepción
     * (p.ej. ChatWebSocketServer). Para evitar duplicados, no persiste en BD aquí.
     */
    public void logFile(String from, String filename) {
        // No-op en BD para evitar duplicados; la acción FILE se guarda
        // únicamente desde ChatWebSocketServer con bytes y metadatos.
    }

    public void logVideoStart() { logInfo("Videollamada iniciada"); }
    public void logVideoEnd() { logInfo("Videollamada finalizada"); }
    public void logVideoJoin(String username) {
        lock.lock();
        try {
            Integer uid = actionDAO.getUserIdByUsername(username);
            actionDAO.insertAction("VIDEO_JOIN", "global", uid, false);
        } finally {
            lock.unlock();
        }
    }
    public void logVideoLeave(String username) {
        lock.lock();
        try {
            Integer uid = actionDAO.getUserIdByUsername(username);
            actionDAO.insertAction("VIDEO_LEAVE", "global", uid, false);
        } finally {
            lock.unlock();
        }
    }

    public synchronized void close() {
        // No hay recursos de archivo que cerrar; se podría registrar parada
        logInfo("Servidor detenido");
    }
}
