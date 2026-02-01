const pool = require('../src/config/database');

module.exports = {
    name: '001_create_usuarios',
    
    async up() {
        try {
            const query = `
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            await pool.query(query);
            console.log('[OK] Tabla usuarios creada/verificada');
        } catch (error) {
            console.error('✗ Error en migración usuarios:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DROP TABLE IF EXISTS usuarios');
            console.log('[OK] Tabla usuarios eliminada');
        } catch (error) {
            console.error('✗ Error eliminando tabla usuarios:', error.message);
            throw error;
        }
    }
};
