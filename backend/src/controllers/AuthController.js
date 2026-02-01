const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class AuthController {
    // Registro
    static async registro(req, res) {
        try {
            const { nombre, apellido, cedula, correo, contraseña, telefono, direccion } = req.body;

            // Validaciones
            if (!nombre || !apellido || !cedula || !correo || !contraseña) {
                return res.status(400).json({ error: 'Faltan campos requeridos' });
            }

            // Verificar si correo existe
            const existe = await Usuario.existeCorreo(correo);
            if (existe) {
                return res.status(400).json({ error: 'El correo ya está registrado' });
            }

            // Crear usuario
            const resultado = await Usuario.crear({
                nombre,
                apellido,
                cedula,
                correo,
                contraseña,
                telefono: telefono || '',
                direccion: direccion || '',
                rol: 'usuario'
            });

            return res.status(201).json({
                mensaje: 'Usuario registrado exitosamente',
                usuarioId: resultado.insertId
            });
        } catch (error) {
            console.error('Error en registro:', error);
            return res.status(500).json({ error: 'Error al registrar usuario' });
        }
    }

    // Login
    static async login(req, res) {
        try {
            const { correo, contraseña } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('user-agent') || '';

            if (!correo || !contraseña) {
                // Registrar intento fallido - sin usuario
                console.log(`[LOGIN FALLIDO] Sin credenciales: ${correo}`);
                await AuthController.registrarLoginLog(null, correo, 'fallida_contraseña', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                return res.status(400).json({ error: 'Correo y contraseña requeridos' });
            }

            const usuario = await Usuario.obtenerPorCorreo(correo);
            if (!usuario) {
                // Registrar intento - usuario no existe
                console.log(`[LOGIN FALLIDO] Usuario no existe: ${correo}`);
                await AuthController.registrarLoginLog(null, correo, 'usuario_no_existe', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const esValido = await Usuario.verificarContraseña(contraseña, usuario.contraseña);
            if (!esValido) {
                // Registrar intento fallido - contraseña incorrecta
                console.log(`[LOGIN FALLIDO] Contraseña incorrecta: ${correo}`);
                await AuthController.registrarLoginLog(usuario.id, correo, 'fallida_contraseña', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Si es usuario normal, requiere validación facial
            if (usuario.rol === 'usuario' && !usuario.imagen) {
                console.log(`[LOGIN FALLIDO] Sin imagen facial: ${correo}`);
                await AuthController.registrarLoginLog(usuario.id, correo, 'facial_fallido', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                return res.status(403).json({ 
                    error: 'Primero debes registrar tu imagen facial',
                    usuarioId: usuario.id
                });
            }

            // Login exitoso
            console.log(`[LOGIN EXITOSO] ${correo}`);
            await AuthController.registrarLoginLog(usuario.id, correo, 'exitoso', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));

            // Generar JWT
            const token = jwt.sign(
                { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
                process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2025',
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            return res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    apellido: usuario.apellido,
                    correo: usuario.correo,
                    rol: usuario.rol,
                    tieneImagenFacial: !!usuario.imagen
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            return res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }

    // Registrar log de login
    static async registrarLoginLog(usuarioId, correo, tipo, ipAddress, userAgent) {
        try {
            const tiposValidos = ['exitoso', 'fallida_contraseña', 'usuario_no_existe', 'cuenta_bloqueada', 'facial_fallido'];
            
            if (!tiposValidos.includes(tipo)) {
                console.error(`[ERROR] Tipo de login inválido: ${tipo}. Valores válidos: ${tiposValidos.join(', ')}`);
                tipo = 'fallida_contraseña'; // valor por defecto
            }

            const query = `
                INSERT INTO login_logs (usuario_id, correo, tipo, ip_address, user_agent, timestamp)
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            const [resultado] = await pool.query(query, [usuarioId, correo, tipo, ipAddress, userAgent]);
            console.log(`[✓ LOG REGISTRADO] ${correo} - ${tipo} (ID: ${resultado.insertId})`);
        } catch (error) {
            console.error(`[✗ ERROR] Registrando log de login: ${error.message}`);
            // No interrumpir el flujo si falla el log
        }
    }

    // Guardar imagen facial
    static async guardarImagenFacial(req, res) {
        try {
            const { usuarioId } = req.params;
            
            if (!req.file) {
                return res.status(400).json({ error: 'No se proporcionó imagen' });
            }

            await Usuario.guardarImagen(usuarioId, req.file.buffer);

            return res.json({ mensaje: 'Imagen facial guardada exitosamente' });
        } catch (error) {
            console.error('Error al guardar imagen:', error);
            return res.status(500).json({ error: 'Error al guardar imagen facial' });
        }
    }

    // Obtener imagen facial
    static async obtenerImagenFacial(req, res) {
        try {
            const { usuarioId } = req.params;
            const imagen = await Usuario.obtenerImagen(usuarioId);

            if (!imagen) {
                return res.status(404).json({ error: 'No hay imagen registrada' });
            }

            res.setHeader('Content-Type', 'image/jpeg');
            res.send(imagen);
        } catch (error) {
            console.error('Error al obtener imagen:', error);
            return res.status(500).json({ error: 'Error al obtener imagen' });
        }
    }

    // Verificar identidad facial (para login)
    static async verificarIdentidad(req, res) {
        try {
            const { usuarioId } = req.params;

            console.log('[DEBUG] verificarIdentidad llamado');
            console.log('[DEBUG] usuarioId:', usuarioId);
            console.log('[DEBUG] req.file:', req.file ? 'SI - ' + req.file.size + ' bytes' : 'NO');
            console.log('[DEBUG] req.files:', req.files);
            console.log('[DEBUG] req.body:', req.body);

            // Validar que se envió una imagen
            if (!req.file) {
                console.log('[ERROR] No se recibió archivo');
                return res.status(400).json({ error: 'No se capturó imagen facial' });
            }

            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                console.log('[ERROR] Usuario no encontrado:', usuarioId);
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            console.log('[DEBUG] Usuario encontrado:', usuario.nombre);
            console.log('[DEBUG] Usuario tiene imagen:', !!usuario.imagen);

            // Validar que el usuario tiene imagen registrada
            if (!usuario.imagen) {
                console.log('[ERROR] Usuario sin imagen registrada');
                return res.status(403).json({ 
                    error: 'El usuario no tiene imagen facial registrada',
                    usuarioId: usuario.id
                });
            }

            // En una aplicación real aquí se compararían las imágenes
            // Por ahora simplemente validamos que se capturó correctamente
            if (req.file.size < 1000) {
                console.log('[ERROR] Imagen muy pequeña:', req.file.size);
                return res.status(400).json({ error: 'Imagen muy pequeña o corrupta' });
            }

            console.log(`[LOG] Identidad verificada: Usuario ${usuarioId}`);

            // Generar nuevo token después de validación facial
            const token = jwt.sign(
                { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
                process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2025',
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            return res.json({
                mensaje: 'Identidad verificada',
                token,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    apellido: usuario.apellido,
                    correo: usuario.correo,
                    rol: usuario.rol
                }
            });
        } catch (error) {
            console.error('[ERROR] Error al verificar identidad:', error);
            return res.status(500).json({ error: 'Error al verificar identidad' });
        }
    }

    // Registrar fallo en validación facial
    static async registrarFalloFacial(req, res) {
        try {
            const { usuarioId } = req.params;

            // Validar usuarioId
            if (!usuarioId) {
                console.log('[ERROR] usuarioId no proporcionado');
                return res.status(400).json({ error: 'usuarioId requerido' });
            }

            // Obtener usuario para obtener correo
            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                console.log('[ERROR] Usuario no encontrado:', usuarioId);
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Obtener IP y User Agent
            const ipAddress = req.ip || req.connection.remoteAddress || 'N/A';
            const userAgent = req.get('user-agent') || 'N/A';

            console.log(`[FACIAL] Registrando fallo facial para ${usuario.correo} (ID: ${usuarioId})`);

            // Registrar el fallo facial como login fallido
            await AuthController.registrarLoginLog(usuarioId, usuario.correo, 'facial_fallido', ipAddress, userAgent);

            console.log(`[✓ FACIAL] Fallo facial registrado: ${usuario.correo}`);

            return res.json({ 
                mensaje: 'Fallo facial registrado',
                usuarioId,
                correo: usuario.correo
            });
        } catch (error) {
            console.error('[ERROR] Error registrando fallo facial:', error);
            return res.status(500).json({ error: 'Error registrando fallo facial' });
        }
    }
}

module.exports = AuthController;
