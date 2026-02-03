const pool = require('../src/config/database');

module.exports = {
    name: '010_add_descriptor_facial',
    
    async up() {
        try {
            const query = `
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS descriptor_facial TEXT
            `;
            
            await pool.query(query);
            console.log('[OK] Columna descriptor_facial agregada a tabla usuarios');
        } catch (error) {
            // Si el error es que la columna ya existe, ignorar
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('[OK] Columna descriptor_facial ya existe');
            } else {
                console.error('✗ Error en migración add_descriptor_facial:', error.message);
                throw error;
            }
        }
    },

    async down() {
        try {
            await pool.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS descriptor_facial');
            console.log('[OK] Columna descriptor_facial eliminada');
        } catch (error) {
            console.error('✗ Error eliminando columna descriptor_facial:', error.message);
            throw error;
        }
    }
};
