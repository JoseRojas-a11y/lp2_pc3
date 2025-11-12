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

-- Tabla de mensajes (opcional para historial)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'file') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_username) REFERENCES users(username) ON DELETE CASCADE,
    INDEX idx_sender (sender_username),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de prueba (usuarios ejemplo)
-- Contraseñas sin hash para desarrollo (en producción usar bcrypt)
INSERT IGNORE INTO users (username, full_name, password_hash) VALUES
('admin', 'Administrador', 'admin123'),
('jose', 'José Rojas', 'jose123'),
('maria', 'María García', 'maria123');

-- Verificar la creación
SELECT 'Tablas creadas correctamente' AS status;
SELECT COUNT(*) AS total_usuarios FROM users;
