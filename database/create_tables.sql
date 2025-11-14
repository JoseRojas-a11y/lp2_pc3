-- Script de creación de base de datos para NextTalk
-- Base de datos: chatapp

CREATE DATABASE IF NOT EXISTS chatapp;
USE chatapp;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NUEVA ESTRUCTURA PARA HISTORIAL DE INTERACCIONES
-- Tabla principal de acciones (cada interacción registrada una sola vez)
-- action_type define la naturaleza de la acción y se detalla en tablas secundarias cuando aplica
CREATE TABLE IF NOT EXISTS actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action_type ENUM('TEXT','FILE','LOGIN','LOGOUT','VIDEO_JOIN','VIDEO_LEAVE','SYSTEM') NOT NULL,
    room VARCHAR(100) NOT NULL DEFAULT 'global',
    actor_user_id INT NULL,                 -- NULL si es generada por el servidor/sistema
    server_generated TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_created (room, created_at),
    INDEX idx_type_created (action_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalles específicos para acciones de texto (solo se insertan filas con action_type = 'TEXT')
CREATE TABLE IF NOT EXISTS action_text_details (
    action_id BIGINT PRIMARY KEY,
    content TEXT NOT NULL,
    content_length INT NOT NULL,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalles específicos para acciones de archivo (solo se insertan filas con action_type = 'FILE')
CREATE TABLE IF NOT EXISTS action_file_details (
    action_id BIGINT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(120) NOT NULL,
    size BIGINT NOT NULL,
    data LONGBLOB NOT NULL,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE,
    INDEX idx_filename (filename),
    INDEX idx_mimetype (mimetype)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de prueba (usuarios ejemplo)
-- Contraseñas sin hash para desarrollo (en producción usar bcrypt)
INSERT IGNORE INTO users (username, full_name, password_hash) VALUES
('admin', 'Administrador', 'admin123'),
('jose', 'José Rojas', 'jose123'),
('maria', 'María García', 'maria123');

-- Ejemplos de inserción para la nueva estructura (comentado):
-- INSERT INTO actions(action_type, room, actor_user_id) VALUES ('TEXT','global',1);
-- INSERT INTO action_text_details(action_id, content, content_length) VALUES (LAST_INSERT_ID(),'Hola a todos', 12);
-- INSERT INTO actions(action_type, room, actor_user_id) VALUES ('FILE','global',1);
-- INSERT INTO action_file_details(action_id, filename, mimetype, size, data) VALUES (LAST_INSERT_ID(),'ejemplo.txt','text/plain',20,0x5465737420656a656d706c6f);

-- Verificar la creación
SELECT 'Tablas creadas correctamente' AS status;
SELECT COUNT(*) AS total_usuarios FROM users;
