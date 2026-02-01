const Usuario = require('../models/Usuario');
const Registro = require('../models/Registro');
const pool = require('../config/database');

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

    // Cambiar rol de usuario (solo admin)
    static async cambiarRol(req, res) {
        try {
            const { usuarioId } = req.params;
            const { rolNuevo, razon } = req.body;
            const adminId = req.usuario.id;

            // Validar que el admin no sea el que intenta cambiar su propio rol
            if (parseInt(usuarioId) === adminId) {
                return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
            }

            // Validar rol nuevo
            if (!['usuario', 'admin'].includes(rolNuevo)) {
                return res.status(400).json({ error: 'Rol inválido' });
            }

            // Obtener usuario actual
            const usuarioActual = await Usuario.obtenerPorId(usuarioId);
            if (!usuarioActual) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const rolAnterior = usuarioActual.rol;

            // Si el rol es igual, no hacer nada
            if (rolAnterior === rolNuevo) {
                return res.status(400).json({ error: 'El usuario ya tiene ese rol' });
            }

            // Actualizar rol
            await Usuario.actualizarRol(usuarioId, rolNuevo);

            // Registrar cambio en historial
            UsuarioController.registrarCambioRol(usuarioId, adminId, rolAnterior, rolNuevo, razon || '').catch(() => {});

            return res.json({ 
                mensaje: 'Rol actualizado exitosamente',
                usuarioId,
                rolAnterior,
                rolNuevo
            });
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            return res.status(500).json({ error: 'Error al cambiar rol' });
        }
    }

    // Registrar cambio de rol en historial
    static async registrarCambioRol(usuarioModificadoId, adminId, rolAnterior, rolNuevo, razon) {
        try {
            const query = `
                INSERT INTO historial_cambios_rol 
                (usuario_modificado_id, admin_id, rol_anterior, rol_nuevo, razon, timestamp)
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            await pool.query(query, [usuarioModificadoId, adminId, rolAnterior, rolNuevo, razon]);
            console.log(`[LOG] Cambio rol: Usuario ${usuarioModificadoId} - ${rolAnterior} a ${rolNuevo}`);
        } catch (error) {
            console.error('Error registrando cambio de rol:', error);
            throw error;
        }
    }
}

module.exports = UsuarioController;
