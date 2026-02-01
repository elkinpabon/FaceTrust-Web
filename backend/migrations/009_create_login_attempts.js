const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

const migration = {
    name: '009_create_login_attempts',
    async up() {
        console.log('Ejecutando migración: 009_create_login_attempts');
        
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    correo VARCHAR(255) NOT NULL,
                    intento INT DEFAULT 1,
                    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_correo (correo),
                    INDEX idx_fecha (fecha)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;
            
            const [resultado] = await pool.query(query);
            console.log('[OK] Tabla login_attempts creada/verificada');
            return true;
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('[SKIP] Tabla login_attempts ya existe');
                return true;
            }
            throw error;
        }
    },

    async down() {
        const query = 'DROP TABLE IF EXISTS login_attempts';
        await pool.query(query);
        console.log('[OK] Tabla login_attempts eliminada');
    }
};

module.exports = migration;
