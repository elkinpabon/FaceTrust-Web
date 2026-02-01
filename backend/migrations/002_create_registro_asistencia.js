const pool = require('../src/config/database');

module.exports = {
    name: '002_create_registro_asistencia',
    
    async up() {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS registro_asistencia (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT NOT NULL,
                    hora_entrada DATETIME NOT NULL,
                    hora_salida DATETIME,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    INDEX idx_usuario (usuario_id),
                    INDEX idx_fecha (hora_entrada)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            await pool.query(query);
            console.log('[OK] Tabla registro_asistencia creada/verificada');
        } catch (error) {
            console.error('✗ Error en migración registro_asistencia:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DROP TABLE IF EXISTS registro_asistencia');
            console.log('[OK] Tabla registro_asistencia eliminada');
        } catch (error) {
            console.error('✗ Error eliminando tabla registro_asistencia:', error.message);
            throw error;
        }
    }
};
