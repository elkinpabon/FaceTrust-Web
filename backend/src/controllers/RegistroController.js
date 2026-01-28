const Registro = require('../models/Registro');
const Usuario = require('../models/Usuario');

class RegistroController {
    // Registrar entrada
    static async registrarEntrada(req, res) {
        try {
            const usuarioId = req.usuario.id;

            const hayEntrada = await Registro.hayEntradaHoy(usuarioId);
            if (hayEntrada) {
                return res.status(409).json({ error: 'Ya hay una entrada registrada para hoy' });
            }

            const resultado = await Registro.registrarEntrada(usuarioId);
            if (resultado.affectedRows === 0) {
                return res.status(400).json({ error: 'No se pudo registrar la entrada' });
            }

            return res.json({ mensaje: 'Entrada registrada exitosamente' });
        } catch (error) {
            console.error('Error al registrar entrada:', error);
            return res.status(500).json({ error: 'Error al registrar entrada' });
        }
    }

    // Registrar salida
    static async registrarSalida(req, res) {
        try {
            const usuarioId = req.usuario.id;

            const resultado = await Registro.registrarSalida(usuarioId);
            if (resultado.affectedRows === 0) {
                return res.status(400).json({ error: 'No hay entrada para registrar salida' });
            }

            return res.json({ mensaje: 'Salida registrada exitosamente' });
        } catch (error) {
            console.error('Error al registrar salida:', error);
            return res.status(500).json({ error: 'Error al registrar salida' });
        }
    }

    // Obtener registros del usuario actual
    static async obtenerMisRegistros(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const registros = await Registro.obtenerRegistrosUsuario(
                req.usuario.id,
                fechaInicio,
                fechaFin
            );

            return res.json(registros);
        } catch (error) {
            console.error('Error al obtener registros:', error);
            return res.status(500).json({ error: 'Error al obtener registros' });
        }
    }

    // Obtener todos los registros (solo admin)
    static async obtenerTodos(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const registros = await Registro.obtenerTodosRegistros(fechaInicio, fechaFin);

            return res.json(registros);
        } catch (error) {
            console.error('Error al obtener registros:', error);
            return res.status(500).json({ error: 'Error al obtener registros' });
        }
    }

    // Obtener registros de usuario específico (admin)
    static async obtenerRegistrosUsuario(req, res) {
        try {
            const { usuarioId } = req.params;
            const { fechaInicio, fechaFin } = req.query;

            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const registros = await Registro.obtenerRegistrosUsuario(usuarioId, fechaInicio, fechaFin);
            return res.json(registros);
        } catch (error) {
            console.error('Error al obtener registros:', error);
            return res.status(500).json({ error: 'Error al obtener registros' });
        }
    }
}

module.exports = RegistroController;
