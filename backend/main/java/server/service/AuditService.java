package server.service;

import server.dao.ActionDAO;

/**
 * AuditService - Servicio de dominio para registrar acciones en BD.
 * Centraliza inserciones en 'actions' y tablas de detalle para evitar duplicidad
 * y mantener una única fuente de verdad.
 */
public final class AuditService {
    private final ActionDAO actionDAO = new ActionDAO();

    public long recordSystem(String message) {
        long id = actionDAO.insertAction("SYSTEM", "global", null, true);
        actionDAO.insertTextDetails(id, message != null ? message : "");
        return id;
    }

    public long recordLogin(String username) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        return actionDAO.insertAction("LOGIN", "global", uid, false);
    }

    public long recordLogout(String username) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        return actionDAO.insertAction("LOGOUT", "global", uid, false);
    }

    public long recordText(String username, String content) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        long id = actionDAO.insertAction("TEXT", "global", uid, false);
        actionDAO.insertTextDetails(id, content != null ? content : "");
        return id;
    }

    public long recordVideoJoin(String username) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        return actionDAO.insertAction("VIDEO_JOIN", "global", uid, false);
    }

    public long recordVideoLeave(String username) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        return actionDAO.insertAction("VIDEO_LEAVE", "global", uid, false);
    }

    public long recordFile(String username, String filename, String mimetype, long size, byte[] bytes) {
        Integer uid = actionDAO.getUserIdByUsername(username);
        long id = actionDAO.insertAction("FILE", "global", uid, false);
        actionDAO.insertFileDetails(id, filename, mimetype, size, bytes);
        return id;
    }
}
