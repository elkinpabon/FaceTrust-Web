const pool = require('../src/config/database');

module.exports = {
    name: '006_update_historial_roles',
    
    async up() {
        try {
            // Modificar columnas para incluir supervisor
            const query1 = `
                ALTER TABLE historial_cambios_rol 
                MODIFY COLUMN rol_anterior ENUM('usuario', 'admin', 'supervisor') NOT NULL
            `;
            await pool.query(query1);

            const query2 = `
                ALTER TABLE historial_cambios_rol 
                MODIFY COLUMN rol_nuevo ENUM('usuario', 'admin', 'supervisor') NOT NULL
            `;
            await pool.query(query2);

            console.log('[OK] Tabla historial_cambios_rol actualizada con rol supervisor');
        } catch (error) {
            console.error('✗ Error en migración update_historial_roles:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            const query1 = `
                ALTER TABLE historial_cambios_rol 
                MODIFY COLUMN rol_anterior ENUM('usuario', 'admin') NOT NULL
            `;
            await pool.query(query1);

            const query2 = `
                ALTER TABLE historial_cambios_rol 
                MODIFY COLUMN rol_nuevo ENUM('usuario', 'admin') NOT NULL
            `;
            await pool.query(query2);

            console.log('[OK] Tabla historial_cambios_rol revertida');
        } catch (error) {
            console.error('✗ Error al revertir migración:', error.message);
            throw error;
        }
    }
};
