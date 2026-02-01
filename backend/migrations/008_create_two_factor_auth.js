const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

const migration = {
    name: '008_create_two_factor_auth',
    async up() {
        console.log('Ejecutando migración: 008_create_two_factor_auth');
        
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS two_factor_auth (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    usuario_id INT NOT NULL,
                    secret_key VARCHAR(255) NOT NULL,
                    is_enabled BOOLEAN DEFAULT FALSE,
                    backup_codes JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_usuario (usuario_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            const [resultado] = await pool.query(query);
            console.log('[OK] Tabla two_factor_auth creada/verificada');
            return true;
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('[SKIP] Tabla two_factor_auth ya existe');
                return true;
            }
            throw error;
        }
    },

    async down() {
        const query = 'DROP TABLE IF EXISTS two_factor_auth';
        await pool.query(query);
        console.log('[OK] Tabla two_factor_auth eliminada');
    }
};

module.exports = migration;
