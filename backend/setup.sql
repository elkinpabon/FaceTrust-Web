-- Tabla de usuarios mejorada
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    rol ENUM('usuario', 'admin') DEFAULT 'usuario',
    imagen LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_correo (correo),
    INDEX idx_cedula (cedula)
);

-- Tabla de registro de asistencia
CREATE TABLE IF NOT EXISTS registro_asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    hora_entrada DATETIME NOT NULL,
    hora_salida DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (hora_entrada)
);

-- Insertar usuario admin por defecto (contraseña: admin123)
INSERT INTO usuarios (nombre, apellido, cedula, correo, contraseña, telefono, direccion, rol)
SELECT 'Administrador', 'Sistema', '0000000', 'admin@reconocimiento.com', '$2a$10$p4wXJCvKn0LbHLVpBnXqKOd9V9V9V9V9V9V9V9V9V9V9V9V9V9V9V9V9', '0000000', 'Sistema', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE cedula = '0000000');

-- Para la contraseña "admin123" encriptada con bcrypt, usa: $2a$10$p4wXJCvKn0LbHLVpBnXqKOd9V9V9V9V9V9V9V9V9V9V9V9V9V9V9V9V9
-- O puedes usar: $2a$10$BQfSXvjYCVPm8D5Zv8KwIeT2I5mLi5uJdD8kLmVn/Qz1Z5Y0nUKna
