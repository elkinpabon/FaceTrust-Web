const pool = require('../src/config/database');

module.exports = {
    name: '004_create_historial_cambios_rol',
    
    async up() {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS historial_cambios_rol (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_modificado_id INT NOT NULL,
                    admin_id INT NOT NULL,
                    rol_anterior ENUM('usuario', 'admin') NOT NULL,
                    rol_nuevo ENUM('usuario', 'admin') NOT NULL,
                    razon TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (usuario_modificado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
                    INDEX idx_usuario_modificado (usuario_modificado_id),
                    INDEX idx_admin (admin_id),
                    INDEX idx_timestamp (timestamp)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            await pool.query(query);
            console.log('[OK] Tabla historial_cambios_rol creada/verificada');
        } catch (error) {
            console.error('✗ Error en migración historial_cambios_rol:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DROP TABLE IF EXISTS historial_cambios_rol');
            console.log('[OK] Tabla historial_cambios_rol eliminada');
        } catch (error) {
            console.error('✗ Error eliminando tabla historial_cambios_rol:', error.message);
            throw error;
        }
    }
};
