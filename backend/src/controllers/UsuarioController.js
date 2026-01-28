const Usuario = require('../models/Usuario');
const Registro = require('../models/Registro');

class UsuarioController {
    // Obtener perfil del usuario actual
    static async obtenerPerfil(req, res) {
        try {
            const usuario = await Usuario.obtenerPorId(req.usuario.id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            return res.json(usuario);
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            return res.status(500).json({ error: 'Error al obtener perfil' });
        }
    }

    // Actualizar perfil
    static async actualizarPerfil(req, res) {
        try {
            const { nombre, apellido, telefono, direccion } = req.body;

            await Usuario.actualizar(req.usuario.id, {
                nombre,
                apellido,
                telefono,
                direccion
            });

            return res.json({ mensaje: 'Perfil actualizado exitosamente' });
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            return res.status(500).json({ error: 'Error al actualizar perfil' });
        }
    }

    // Obtener todos los usuarios (solo admin)
    static async obtenerTodos(req, res) {
        try {
            const { filtro } = req.query;
            const usuarios = await Usuario.obtenerTodos(filtro || '');

            return res.json(usuarios);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            return res.status(500).json({ error: 'Error al obtener usuarios' });
        }
    }

    // Obtener usuario por ID (solo admin)
    static async obtenerPorId(req, res) {
        try {
            const { usuarioId } = req.params;
            const usuario = await Usuario.obtenerPorId(usuarioId);

            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            return res.json(usuario);
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            return res.status(500).json({ error: 'Error al obtener usuario' });
        }
    }

    // Eliminar usuario (solo admin)
    static async eliminar(req, res) {
        try {
            const { usuarioId } = req.params;

            if (parseInt(usuarioId) === req.usuario.id) {
                return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
            }

            await Usuario.eliminar(usuarioId);
            return res.json({ mensaje: 'Usuario eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            return res.status(500).json({ error: 'Error al eliminar usuario' });
        }
    }
}

module.exports = UsuarioController;
