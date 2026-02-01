const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validate: isValidEmail } = require('email-validator');
const xss = require('xss');
const LoginAttempts = require('../utils/LoginAttempts');
const TwoFactorService = require('../services/TwoFactorService');

class AuthController {
    // Registro
    static async registro(req, res) {
        try {
            const { nombre, apellido, cedula, correo, contraseña, telefono, direccion } = req.body;

            // Validaciones básicas
            if (!nombre || !apellido || !cedula || !correo || !contraseña) {
                return res.status(400).json({ error: 'Faltan campos requeridos' });
            }

            // Sanitizar inputs
            const nombreSanitizado = xss(nombre.trim());
            const apellidoSanitizado = xss(apellido.trim());
            const cedulaSanitizado = xss(cedula.trim());
            const correoSanitizado = xss(correo.trim().toLowerCase());

            // Validar email
            if (!isValidEmail(correoSanitizado)) {
                return res.status(400).json({ error: 'Email inválido' });
            }

            // Validar longitud de contraseña
            if (contraseña.length < 8) {
                return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
            }

            // Validar fortaleza de contraseña
            const regexContraseña = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!regexContraseña.test(contraseña)) {
                return res.status(400).json({ 
                    error: 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)' 
                });
            }

            // Validar cédula (números solamente)
            if (!/^\d{6,12}$/.test(cedulaSanitizado)) {
                return res.status(400).json({ error: 'Cédula inválida (6-12 dígitos)' });
            }

            // Validar nombre (solo letras y espacios)
            if (!/^[a-záéíóúñ\s]{2,}$/i.test(nombreSanitizado)) {
                return res.status(400).json({ error: 'Nombre inválido (solo letras y espacios, mínimo 2)' });
            }

            // Validar teléfono si se proporciona
            if (telefono && !/^\d{7,15}$/.test(telefono.replace(/\D/g, ''))) {
                return res.status(400).json({ error: 'Teléfono inválido' });
            }

            // Verificar si correo existe
            const existe = await Usuario.existeCorreo(correoSanitizado);
            if (existe) {
                return res.status(400).json({ error: 'El correo ya está registrado' });
            }

            // Verificar si cédula existe
            const cedulaExiste = await Usuario.existeCedula(cedulaSanitizado);
            if (cedulaExiste) {
                return res.status(400).json({ error: 'La cédula ya está registrada' });
            }

            // Crear usuario con datos sanitizados
            const resultado = await Usuario.crear({
                nombre: nombreSanitizado,
                apellido: apellidoSanitizado,
                cedula: cedulaSanitizado,
                correo: correoSanitizado,
                contraseña,
                telefono: telefono ? xss(telefono.trim()) : '',
                direccion: direccion ? xss(direccion.trim()) : '',
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
                await AuthController.registrarLoginLog(null, correo || 'desconocido', 'fallida_contraseña', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                return res.status(400).json({ error: 'Correo y contraseña requeridos' });
            }

            // Sanitizar y validar email
            const correoSanitizado = xss(correo.trim().toLowerCase());
            if (!isValidEmail(correoSanitizado)) {
                return res.status(400).json({ error: 'Email inválido' });
            }

            const usuario = await Usuario.obtenerPorCorreo(correoSanitizado);
            if (!usuario) {
                // Registrar intento - usuario no existe
                console.log(`[LOGIN FALLIDO] Usuario no existe: ${correo}`);
                await AuthController.registrarLoginLog(null, correo, 'usuario_no_existe', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                
                // Registrar intento fallido
                await LoginAttempts.registrarIntento(correoSanitizado);
                const intentos = await LoginAttempts.obtenerIntentos(correoSanitizado);
                
                return res.status(401).json({ 
                    error: 'Credenciales inválidas',
                    intentosFallidos: intentos,
                    bloqueadoPara2FA: intentos >= 5
                });
            }

            console.log(`[LOGIN] Verificando contraseña para ${correoSanitizado}`);
            console.log(`[LOGIN] Hash almacenado: ${usuario.contraseña.substring(0, 20)}...`);
            
            const esValido = await Usuario.verificarContraseña(contraseña, usuario.contraseña);
            console.log(`[LOGIN] Contraseña válida: ${esValido}`);
            
            if (!esValido) {
                // Registrar intento fallido - contraseña incorrecta
                console.log(`[LOGIN FALLIDO] Contraseña incorrecta: ${correo}`);
                await AuthController.registrarLoginLog(usuario.id, correo, 'fallida_contraseña', ipAddress, userAgent).catch(err => console.error('[ERROR REG LOG]', err.message));
                
                // Registrar intento fallido
                await LoginAttempts.registrarIntento(correoSanitizado);
                const intentos = await LoginAttempts.obtenerIntentos(correoSanitizado);
                
                // Si alcanzó 5 intentos, sugerir 2FA
                if (intentos >= 5) {
                    console.log(`[2FA] Se alcanzó límite de intentos para ${correoSanitizado}. Sugeriendo 2FA.`);
                    return res.status(429).json({ 
                        error: 'Demasiados intentos fallidos. Usa Google Authenticator para continuar',
                        bloqueadoPara2FA: true,
                        intentosFallidos: intentos,
                        correo: correoSanitizado,
                        proximoIntento: 'Ingresa tu código de Google Authenticator'
                    });
                }
                
                return res.status(401).json({ 
                    error: 'Credenciales inválidas',
                    intentosFallidos: intentos,
                    bloqueadoPara2FA: false,
                    intentosRestantes: 5 - intentos
                });
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
            
            // Limpiar intentos fallidos
            await LoginAttempts.limpiarIntentos(correoSanitizado);

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

    // Solicitar 2FA (después de 5 intentos fallidos)
    static async solicitarDosFA(req, res) {
        try {
            const { correo } = req.body;

            if (!correo) {
                return res.status(400).json({ error: 'Email requerido' });
            }

            const correoSanitizado = xss(correo.trim().toLowerCase());
            if (!isValidEmail(correoSanitizado)) {
                return res.status(400).json({ error: 'Email inválido' });
            }

            const usuario = await Usuario.obtenerPorCorreo(correoSanitizado);
            if (!usuario) {
                return res.status(401).json({ error: 'Usuario no encontrado' });
            }

            console.log(`[2FA] Solicitando 2FA para ${correoSanitizado}`);

            // Generar nuevo secret siempre
            const datos = await TwoFactorService.generarSecret(correoSanitizado);
            const secret = datos.secret;
            const qrCode = datos.qrCode;
            
            // Habilitar 2FA
            await TwoFactorService.habilitarDosFA(usuario.id, secret);
            console.log(`[2FA] ✓ 2FA generado para ${correoSanitizado}`);

            return res.json({
                mensaje: 'Escanea el código QR con Google Authenticator',
                usuarioId: usuario.id,
                qrCode: qrCode,
                tieneCodigoQR: true,
                instrucciones: 'Abre Google Authenticator y escanea el código QR o ingresa manualmente el código de configuración'
            });
        } catch (error) {
            console.error('[ERROR] Error en solicitarDosFA:', error);
            return res.status(500).json({ error: 'Error al solicitar 2FA' });
        }
    }

    // Verificar código 2FA
    static async verificarDosFA(req, res) {
        try {
            const { usuarioId, codigo } = req.body;

            if (!usuarioId || !codigo) {
                return res.status(400).json({ error: 'usuarioId y código requeridos' });
            }

            // Validar que código sea números de 6 dígitos
            if (!/^\d{6}$/.test(codigo)) {
                return res.status(400).json({ error: 'Código debe ser 6 dígitos' });
            }

            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const secret = await TwoFactorService.obtenerSecret(usuarioId);
            if (!secret) {
                return res.status(400).json({ error: '2FA no configurado para este usuario' });
            }

            // Verificar código
            const esValido = TwoFactorService.verificarCodigo(secret, codigo);
            if (!esValido) {
                return res.status(401).json({ error: 'Código inválido o expirado' });
            }

            // Limpiar intentos fallidos de login
            await LoginAttempts.limpiarIntentos(usuario.correo);

            // Generar JWT
            const token = jwt.sign(
                { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
                process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2025',
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            console.log(`[2FA] ✓ Código verificado - Login exitoso para ${usuario.correo}`);

            return res.json({
                mensaje: 'Login exitoso con 2FA',
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
            console.error('[ERROR] Error verificando 2FA:', error);
            return res.status(500).json({ error: 'Error verificando código' });
        }
    }
}

module.exports = AuthController;
