const Usuario = require('../models/Usuario');
const Registro = require('../models/Registro');
const pool = require('../config/database');
const xss = require('xss');

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

            // Validaciones y sanitización
            if (nombre && !/^[a-záéíóúñ\s]{2,}$/i.test(nombre.trim())) {
                return res.status(400).json({ error: 'Nombre inválido' });
            }
            if (telefono && !/^\d{7,15}$/.test(telefono.replace(/\D/g, ''))) {
                return res.status(400).json({ error: 'Teléfono inválido' });
            }

            await Usuario.actualizar(req.usuario.id, {
                nombre: nombre ? xss(nombre.trim()) : undefined,
                apellido: apellido ? xss(apellido.trim()) : undefined,
                telefono: telefono ? xss(telefono.trim()) : undefined,
                direccion: direccion ? xss(direccion.trim()) : undefined
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

    // Actualizar usuario (solo admin)
    static async actualizar(req, res) {
        try {
            const { usuarioId } = req.params;
            const { nombre, apellido, correo, telefono, direccion, rol } = req.body;
            const adminId = req.usuario.id;

            // Validar que el usuario existe
            const usuarioActual = await Usuario.obtenerPorId(usuarioId);
            if (!usuarioActual) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Validar correo único si cambió
            if (correo && correo !== usuarioActual.correo) {
                const existeCorreo = await Usuario.obtenerPorCorreo(correo);
                if (existeCorreo && existeCorreo.id !== parseInt(usuarioId)) {
                    return res.status(400).json({ error: 'El correo ya está registrado' });
                }
            }

            // Preparar datos para actualizar
            const datosActualizar = {
                nombre: nombre || usuarioActual.nombre,
                apellido: apellido || usuarioActual.apellido,
                correo: correo || usuarioActual.correo,
                telefono: telefono !== undefined ? telefono : usuarioActual.telefono,
                direccion: direccion !== undefined ? direccion : usuarioActual.direccion
            };

            // Registrar TODOS los cambios en historial
            const cambios = [];
            
            if (nombre && nombre !== usuarioActual.nombre) {
                cambios.push({
                    campo: 'nombre',
                    anterior: usuarioActual.nombre,
                    nuevo: nombre
                });
            }
            
            if (apellido && apellido !== usuarioActual.apellido) {
                cambios.push({
                    campo: 'apellido',
                    anterior: usuarioActual.apellido,
                    nuevo: apellido
                });
            }
            
            if (correo && correo !== usuarioActual.correo) {
                cambios.push({
                    campo: 'correo',
                    anterior: usuarioActual.correo,
                    nuevo: correo
                });
            }
            
            if (telefono !== undefined && telefono !== usuarioActual.telefono) {
                cambios.push({
                    campo: 'telefono',
                    anterior: usuarioActual.telefono || '',
                    nuevo: telefono
                });
            }
            
            if (direccion !== undefined && direccion !== usuarioActual.direccion) {
                cambios.push({
                    campo: 'direccion',
                    anterior: usuarioActual.direccion || '',
                    nuevo: direccion
                });
            }
            
            if (rol && rol !== usuarioActual.rol) {
                // Validar rol
                if (!['usuario', 'admin', 'supervisor'].includes(rol)) {
                    return res.status(400).json({ error: 'Rol inválido' });
                }
                
                cambios.push({
                    campo: 'rol',
                    anterior: usuarioActual.rol,
                    nuevo: rol
                });
                
                datosActualizar.rol = rol;
            }

            // Actualizar datos en base de datos
            await Usuario.actualizar(usuarioId, datosActualizar);

            // Registrar TODOS los cambios en historial
            if (cambios.length > 0) {
                console.log(`[ACTUALIZACIÓN] Registrando ${cambios.length} cambios para usuario ${usuarioId}`);
                
                for (const cambio of cambios) {
                    try {
                        await UsuarioController.registrarCambioUsuario(
                            usuarioId,
                            adminId,
                            cambio.campo,
                            cambio.anterior,
                            cambio.nuevo,
                            'Cambio desde modal de edición'
                        );
                        console.log(`[✓ ÉXITO] ${cambio.campo}: ${cambio.anterior} → ${cambio.nuevo}`);
                    } catch (historialError) {
                        console.error(`[✗ ERROR] Falló registrar cambio de ${cambio.campo}:`, historialError.message);
                    }
                }
            }

            return res.json({ 
                mensaje: 'Usuario actualizado exitosamente',
                cambiosRegistrados: cambios.length
            });
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            return res.status(500).json({ error: 'Error al actualizar usuario' });
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
            if (!['usuario', 'admin', 'supervisor'].includes(rolNuevo)) {
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

            // Registrar cambio en historial PRIMERO
            try {
                await UsuarioController.registrarCambioRol(usuarioId, adminId, rolAnterior, rolNuevo, razon || '');
                console.log(`[LOG] Cambio registrado en historial: Usuario ${usuarioId}`);
            } catch (historialError) {
                console.error(`[ERROR] Falló al registrar cambio en historial:`, historialError.message);
                throw new Error(`No se pudo registrar el cambio en el historial: ${historialError.message}`);
            }

            // Actualizar rol después de registrar
            await Usuario.actualizarRol(usuarioId, rolNuevo);

            return res.json({ 
                mensaje: 'Rol actualizado exitosamente',
                usuarioId,
                rolAnterior,
                rolNuevo
            });
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            return res.status(500).json({ error: 'Error al cambiar rol: ' + error.message });
        }
    }

    // Registrar cambio de usuario (genérico para todos los campos)
    static async registrarCambioUsuario(usuarioModificadoId, adminId, campo, valorAnterior, valorNuevo, razon) {
        try {
            console.log(`[REGISTRO] ${campo}: ${valorAnterior} → ${valorNuevo} (Usuario: ${usuarioModificadoId})`);
            
            // Validar parámetros
            if (!usuarioModificadoId || !adminId || !campo) {
                throw new Error('Parámetros incompletos para registrar cambio');
            }

            const query = `
                INSERT INTO historial_cambios_usuario 
                (usuario_modificado_id, admin_id, campo_modificado, valor_anterior, valor_nuevo, razon, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const [resultado] = await pool.query(query, [
                usuarioModificadoId, 
                adminId, 
                campo, 
                String(valorAnterior).substring(0, 255),
                String(valorNuevo).substring(0, 255),
                razon || ''
            ]);
            
            console.log(`[✓ ÉXITO] Cambio registrado: ID ${resultado.insertId}`);
            
            return resultado;
        } catch (error) {
            console.error(`[✗ ERROR] Registrando ${campo}:`, error.message);
            throw error;
        }
    }

    // Registrar cambio de rol en historial
    static async registrarCambioRol(usuarioModificadoId, adminId, rolAnterior, rolNuevo, razon) {
        try {
            console.log(`[REGISTRO] Iniciando registro: Usuario=${usuarioModificadoId}, Admin=${adminId}, ${rolAnterior}→${rolNuevo}`);
            
            // Validar que los parámetros no sean nulos
            if (!usuarioModificadoId || !adminId || !rolAnterior || !rolNuevo) {
                throw new Error('Parámetros incompletos para registrar cambio de rol');
            }

            // Validar roles válidos
            const rolesValidos = ['usuario', 'admin', 'supervisor'];
            if (!rolesValidos.includes(rolAnterior) || !rolesValidos.includes(rolNuevo)) {
                throw new Error(`Roles inválidos: ${rolAnterior}, ${rolNuevo}`);
            }

            const query = `
                INSERT INTO historial_cambios_rol 
                (usuario_modificado_id, admin_id, rol_anterior, rol_nuevo, razon, timestamp)
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            
            const [resultado] = await pool.query(query, [usuarioModificadoId, adminId, rolAnterior, rolNuevo, razon || '']);
            
            console.log(`[✓ ÉXITO] Cambio de rol registrado: Usuario ${usuarioModificadoId} - ${rolAnterior} → ${rolNuevo} (ID: ${resultado.insertId})`);
            
            return resultado;
        } catch (error) {
            console.error(`[✗ ERROR] Error registrando cambio de rol:`, error.message);
            console.error(`[✗ ERROR] Detalles:`, error.code, error.sqlMessage);
            throw error;
        }
    }

    // Obtener logs de login (solo admin)
    static async obtenerLogsLogin(req, res) {
        try {
            const query = `
                SELECT 
                    ll.id,
                    ll.usuario_id,
                    ll.correo as usuario_email,
                    u.nombre as usuario_nombre,
                    ll.tipo,
                    ll.ip_address,
                    ll.timestamp as fecha_hora
                FROM login_logs ll
                LEFT JOIN usuarios u ON ll.usuario_id = u.id
                ORDER BY ll.timestamp DESC
                LIMIT 500
            `;
            const [rows] = await pool.query(query);
            
            // Normalizar datos y agregar estado
            const logsNormalizados = rows.map(row => ({
                ...row,
                estado: row.tipo === 'exitoso' ? 'exitoso' : 'fallido',
                tipo_error: row.tipo === 'exitoso' ? '-' : (row.tipo || 'error_desconocido')
            }));
            
            return res.json(logsNormalizados);
        } catch (error) {
            console.error('Error al obtener logs:', error);
            return res.status(500).json({ error: 'Error al obtener logs de login' });
        }
    }

    // Obtener historial de cambios (solo admin)
    static async obtenerHistorialCambios(req, res) {
        try {
            const query = `
                SELECT 
                    hcu.id,
                    hcu.usuario_modificado_id,
                    u.nombre as usuario_nombre,
                    u.correo as usuario_email,
                    hcu.campo_modificado,
                    hcu.valor_anterior,
                    hcu.valor_nuevo,
                    admin.nombre as modificado_por,
                    hcu.razon,
                    hcu.timestamp as fecha_cambio
                FROM historial_cambios_usuario hcu
                LEFT JOIN usuarios u ON hcu.usuario_modificado_id = u.id
                LEFT JOIN usuarios admin ON hcu.admin_id = admin.id
                ORDER BY hcu.timestamp DESC
                LIMIT 500
            `;
            const [rows] = await pool.query(query);
            return res.json(rows);
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return res.status(500).json({ error: 'Error al obtener historial de cambios' });
        }
    }
}

module.exports = UsuarioController;
