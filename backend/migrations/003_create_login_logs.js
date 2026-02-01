const pool = require('../src/config/database');

module.exports = {
    name: '003_create_login_logs',
    
    async up() {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS login_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT,
                    correo VARCHAR(100) NOT NULL,
                    tipo ENUM('exitoso', 'fallida_contraseña', 'usuario_no_existe', 'cuenta_bloqueada', 'facial_fallido') DEFAULT 'exitoso',
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                    INDEX idx_usuario (usuario_id),
                    INDEX idx_tipo (tipo),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_correo (correo)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            await pool.query(query);
            console.log('[OK] Tabla login_logs creada/verificada');
        } catch (error) {
            console.error('✗ Error en migración login_logs:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DROP TABLE IF EXISTS login_logs');
            console.log('[OK] Tabla login_logs eliminada');
        } catch (error) {
            console.error('✗ Error eliminando tabla login_logs:', error.message);
            throw error;
        }
    }
};
