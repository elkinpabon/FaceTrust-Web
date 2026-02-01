const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');

module.exports = {
    name: '005_create_admin_user',
    
    async up() {
        try {
            // Verificar si el admin ya existe
            const [existingAdmin] = await pool.query(
                'SELECT id FROM usuarios WHERE cedula = ? AND rol = ?',
                ['0000000', 'admin']
            );
            
            if (existingAdmin.length > 0) {
                console.log('[OK] Usuario admin ya existe');
                return;
            }
            
            // Crear contraseña encriptada para "admin123"
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Insertar admin
            const query = `
                INSERT INTO usuarios (nombre, apellido, cedula, correo, contraseña, telefono, direccion, rol, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            await pool.query(query, [
                'Administrador',
                'Sistema',
                '0000000',
                'admin@facetrust.com',
                hashedPassword,
                '0000000',
                'Sistema',
                'admin'
            ]);
            
            console.log('[OK] Usuario admin creado automáticamente');
            console.log('  [EMAIL] admin@facetrust.com');
            console.log('  [PASSWORD] admin123');
        } catch (error) {
            console.error('✗ Error en migración admin user:', error.message);
            throw error;
        }
    },

    async down() {
        try {
            await pool.query('DELETE FROM usuarios WHERE cedula = ? AND rol = ?', ['0000000', 'admin']);
            console.log('[OK] Usuario admin eliminado');
        } catch (error) {
            console.error('✗ Error eliminando usuario admin:', error.message);
            throw error;
        }
    }
};
