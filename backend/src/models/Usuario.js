const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Usuario {
    // Crear nuevo usuario
    static async crear(datos) {
        try {
            const hashedPassword = await bcrypt.hash(datos.contraseña, 10);
            const { nombre, apellido, cedula, correo, telefono, direccion, rol = 'usuario' } = datos;
            
            const query = `
                INSERT INTO usuarios (nombre, apellido, cedula, correo, contraseña, telefono, direccion, rol, imagen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const [resultado] = await pool.query(query, [nombre, apellido, cedula, correo, hashedPassword, telefono, direccion, rol, null]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Obtener usuario por correo
    static async obtenerPorCorreo(correo) {
        try {
            const query = 'SELECT * FROM usuarios WHERE correo = ?';
            const [resultados] = await pool.query(query, [correo]);
            return resultados[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Obtener usuario por ID
    static async obtenerPorId(id) {
        try {
            const query = 'SELECT id, nombre, apellido, cedula, correo, telefono, direccion, rol, imagen, created_at FROM usuarios WHERE id = ?';
            const [resultados] = await pool.query(query, [id]);
            return resultados[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los usuarios (para admin)
    static async obtenerTodos(filtro = '') {
        try {
            let query = 'SELECT id, nombre, apellido, cedula, correo, telefono, direccion, rol, created_at FROM usuarios';
            if (filtro) {
                query += ` WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ? OR cedula LIKE ?`;
                const termino = `%${filtro}%`;
                const [resultados] = await pool.query(query, [termino, termino, termino, termino]);
                return resultados;
            }
            const [resultados] = await pool.query(query);
            return resultados;
        } catch (error) {
            throw error;
        }
    }

    // Guardar imagen facial
    static async guardarImagen(usuarioId, imagen) {
        try {
            const query = 'UPDATE usuarios SET imagen = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [imagen, usuarioId]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Obtener imagen de usuario
    static async obtenerImagen(usuarioId) {
        try {
            const query = 'SELECT imagen FROM usuarios WHERE id = ?';
            const [resultados] = await pool.query(query, [usuarioId]);
            return resultados[0]?.imagen || null;
        } catch (error) {
            throw error;
        }
    }

    // Actualizar perfil
    static async actualizar(id, datos) {
        try {
            const { nombre, apellido, telefono, direccion } = datos;
            const query = 'UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, direccion = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [nombre, apellido, telefono, direccion, id]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Verificar contraseña
    static async verificarContraseña(contraseña, hash) {
        return await bcrypt.compare(contraseña, hash);
    }

    // Verificar si correo existe
    static async existeCorreo(correo, excluirId = null) {
        try {
            let query = 'SELECT id FROM usuarios WHERE correo = ?';
            const params = [correo];
            if (excluirId) {
                query += ' AND id != ?';
                params.push(excluirId);
            }
            const [resultados] = await pool.query(query, params);
            return resultados.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Eliminar usuario (solo admin)
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM usuarios WHERE id = ?';
            const [resultado] = await pool.query(query, [id]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Usuario;
