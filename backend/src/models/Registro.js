const pool = require('../config/database');

class Registro {
    // Registrar entrada
    static async registrarEntrada(usuarioId) {
        try {
            const query = `
                INSERT INTO registro_asistencia (usuario_id, hora_entrada)
                SELECT ?, NOW()
                FROM DUAL
                WHERE NOT EXISTS (
                    SELECT 1 FROM registro_asistencia 
                    WHERE usuario_id = ? AND DATE(hora_entrada) = CURDATE() AND hora_salida IS NULL
                )
            `;
            const [resultado] = await pool.query(query, [usuarioId, usuarioId]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Registrar salida
    static async registrarSalida(usuarioId) {
        try {
            const query = `
                UPDATE registro_asistencia
                SET hora_salida = NOW()
                WHERE usuario_id = ? AND DATE(hora_entrada) = CURDATE() AND hora_salida IS NULL
            `;
            const [resultado] = await pool.query(query, [usuarioId]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Obtener registros de usuario
    static async obtenerRegistrosUsuario(usuarioId, fechaInicio = null, fechaFin = null) {
        try {
            let query = `
                SELECT id, hora_entrada, hora_salida, 
                       TIMEDIFF(hora_salida, hora_entrada) as duracion
                FROM registro_asistencia
                WHERE usuario_id = ?
            `;
            const params = [usuarioId];

            if (fechaInicio && fechaFin) {
                query += ` AND DATE(hora_entrada) BETWEEN ? AND ?`;
                params.push(fechaInicio, fechaFin);
            }

            query += ` ORDER BY hora_entrada DESC`;

            const [resultados] = await pool.query(query, params);
            return resultados;
        } catch (error) {
            throw error;
        }
    }

    // Obtener registros de todos los usuarios (admin)
    static async obtenerTodosRegistros(fechaInicio = null, fechaFin = null) {
        try {
            let query = `
                SELECT r.id, r.usuario_id, u.nombre, u.apellido, r.hora_entrada, r.hora_salida,
                       TIMEDIFF(r.hora_salida, r.hora_entrada) as duracion
                FROM registro_asistencia r
                JOIN usuarios u ON r.usuario_id = u.id
            `;
            const params = [];

            if (fechaInicio && fechaFin) {
                query += ` WHERE DATE(r.hora_entrada) BETWEEN ? AND ?`;
                params.push(fechaInicio, fechaFin);
            }

            query += ` ORDER BY r.hora_entrada DESC`;

            const [resultados] = await pool.query(query, params);
            return resultados;
        } catch (error) {
            throw error;
        }
    }

    // Verificar si hay entrada hoy
    static async hayEntradaHoy(usuarioId) {
        try {
            const query = `
                SELECT COUNT(*) as count FROM registro_asistencia
                WHERE usuario_id = ? AND DATE(hora_entrada) = CURDATE() AND hora_salida IS NULL
            `;
            const [resultados] = await pool.query(query, [usuarioId]);
            return resultados[0].count > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Registro;
