const pool = require('../src/config/database');

module.exports = {
    name: '007_create_historial_cambios_usuario',
    
    async up() {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS historial_cambios_usuario (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_modificado_id INT NOT NULL,
                    admin_id INT NOT NULL,
                    campo_modificado VARCHAR(50) NOT NULL,
                    valor_anterior VARCHAR(255),
                    valor_nuevo VARCHAR(255),
                    razon TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (usuario_modificado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
                    INDEX idx_usuario_modificado (usuario_modificado_id),
                    INDEX idx_admin (admin_id),
                    INDEX idx_campo (campo_modificado),
                    INDEX idx_timestamp (timestamp)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            await pool.query(query);
            console.log('[OK] Tabla historial_cambios_usuario creada/verificada');
        } catch (error) {
            console.error('✗ Error en migración historial_cambios_usuario:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DROP TABLE IF EXISTS historial_cambios_usuario');
            console.log('[OK] Tabla historial_cambios_usuario eliminada');
        } catch (error) {
            console.error('✗ Error eliminando tabla historial_cambios_usuario:', error.message);
            throw error;
        }
    }
};
