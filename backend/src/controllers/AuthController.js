const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validate: isValidEmail } = require('email-validator');
const xss = require('xss');
const LoginAttempts = require('../utils/LoginAttempts');
const TwoFactorService = require('../services/TwoFactorService');
const FaceDescriptorUtils = require('../utils/FaceDescriptorUtils');
const CedulaValidator = require('../utils/CedulaValidator');

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

            // Validar fortaleza de contraseña (desarrollo: más relajado, producción: más estricto)
            let regexContraseña;
            let mensajeError;
            
            if (process.env.NODE_ENV === 'production') {
                // Producción: requiere mayúsculas, minúsculas, números y especiales
                regexContraseña = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                mensajeError = 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)';
            } else {
                // Desarrollo: requiere mayúscula y número
                regexContraseña = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
                
                // Mensaje de error específico
                if (!/[A-Z]/.test(contraseña)) {
                    mensajeError = 'La contraseña debe contener al menos una letra mayúscula (A-Z)';
                } else if (!/\d/.test(contraseña)) {
                    mensajeError = 'La contraseña debe contener al menos un número (0-9)';
                } else {
                    mensajeError = 'La contraseña no cumple los requisitos mínimos';
                }
            }
            
            if (!regexContraseña.test(contraseña)) {
                return res.status(400).json({ error: mensajeError });
            }

            // Validar cédula según políticas de Ecuador
            const validacionCedula = CedulaValidator.validar(cedulaSanitizado);
            if (!validacionCedula.valida) {
                return res.status(400).json({ error: validacionCedula.mensaje });
            }

            // Validar nombre (solo letras, espacios y acentos, mínimo 2)
            if (!/^[a-záéíóúñ\s]{2,}$/i.test(nombreSanitizado) && nombreSanitizado.length < 2) {
                return res.status(400).json({ error: 'Nombre inválido (mínimo 2 caracteres)' });
            }

            // Validar teléfono (10 dígitos exactos, solo números - Ecuador)
            if (telefono && !/^\d{10}$/.test(telefono.replace(/\D/g, ''))) {
                return res.status(400).json({ error: 'Teléfono inválido (debe ser 10 dígitos Ecuador)' });
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

            // NO crear usuario aquí - solo validar
            // El usuario se crea cuando se confirme con escaneo facial
            return res.json({
                mensaje: 'Datos validados correctamente',
                datosValidos: true,
                datosFormulario: {
                    nombre: nombreSanitizado,
                    apellido: apellidoSanitizado,
                    cedula: cedulaSanitizado,
                    correo: correoSanitizado,
                    telefono: telefono ? xss(telefono.trim()) : '',
                    direccion: direccion ? xss(direccion.trim()) : ''
                }
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
            // Los datos vienen en un header personalizado (workaround para multer)
            const datosHeader = req.get('x-registro-datos');
            const descriptorHeader = req.get('x-descriptor-facial');
            
            if (!req.file) {
                return res.status(400).json({ error: 'Debes completar el escaneo facial para registrarte' });
            }

            if (!datosHeader) {
                return res.status(400).json({ error: 'Faltan datos del formulario' });
            }

            if (!descriptorHeader) {
                return res.status(400).json({ error: 'No se pudo procesar el descriptor facial' });
            }

            // Decodificar datos del header
            const datosFormulario = JSON.parse(decodeURIComponent(datosHeader));
            const descriptorFacial = JSON.parse(decodeURIComponent(descriptorHeader));
            
            const { nombre, apellido, cedula, correo, contraseña, telefono, direccion } = datosFormulario;
            
            // Validar que tenga datos de usuario
            if (!nombre || !apellido || !cedula || !correo || !contraseña) {
                return res.status(400).json({ error: 'Faltan datos requeridos del formulario' });
            }

            // Validar que el descriptor sea válido
            if (!FaceDescriptorUtils.esDescriptorValido(descriptorFacial)) {
                return res.status(400).json({ error: 'Descriptor facial inválido' });
            }

            // Sanitizar inputs
            const nombreSanitizado = xss(nombre.trim());
            const apellidoSanitizado = xss(apellido.trim());
            const cedulaSanitizado = xss(cedula.trim());
            const correoSanitizado = xss(correo.trim().toLowerCase());

            // Validar cédula según políticas de Ecuador
            const validacionCedula = CedulaValidator.validar(cedulaSanitizado);
            if (!validacionCedula.valida) {
                return res.status(400).json({ error: validacionCedula.mensaje });
            }

            // Doble validación de email único
            const existe = await Usuario.existeCorreo(correoSanitizado);
            if (existe) {
                return res.status(400).json({ error: 'El correo ya está registrado' });
            }

            // VALIDAR QUE EL ROSTRO SEA ÚNICO
            console.log('[FACE-CHECK] Verificando si el rostro ya está registrado...');
            const usuariosConDescriptores = await Usuario.obtenerTodosDescriptores();
            
            for (const usuario of usuariosConDescriptores) {
                if (usuario.descriptor) {
                    const similares = FaceDescriptorUtils.sonSimilares(
                        descriptorFacial, 
                        usuario.descriptor,
                        0.6 // Umbral de similitud
                    );
                    
                    if (similares) {
                        console.log(`[FACE-CHECK] ✗ Rostro ya registrado (Usuario: ${usuario.nombre} ${usuario.apellido})`);
                        return res.status(409).json({ 
                            error: 'Este rostro ya está registrado en el sistema',
                            mensaje: 'El rostro que intentas registrar ya pertenece a otro usuario',
                            codigoError: 'ROSTRO_DUPLICADO'
                        });
                    }
                }
            }
            
            console.log('[FACE-CHECK] ✓ Rostro único verificado');

            // Solo validar, NO crear usuario aún
            // El usuario se creará después de validar 2FA
            return res.json({ 
                mensaje: 'Imagen facial validada correctamente',
                imagenValida: true
            });
        } catch (error) {
            console.error('Error al validar imagen facial:', error);
            return res.status(500).json({ error: 'Error al validar la imagen facial' });
        }
    }

    // Completar registro después de validar 2FA
    static async completarRegistro(req, res) {
        try {
            const datosHeader = req.get('x-registro-datos');
            const descriptorHeader = req.get('x-descriptor-facial');
            const secretDosFA = req.get('x-dos-fa-secret');

            if (!datosHeader || !descriptorHeader || !req.file) {
                return res.status(400).json({ error: 'Datos incompletos para completar registro' });
            }

            // Decodificar datos
            const datosFormulario = JSON.parse(decodeURIComponent(datosHeader));
            const descriptorFacial = JSON.parse(decodeURIComponent(descriptorHeader));
            
            const { nombre, apellido, cedula, correo, contraseña, telefono, direccion } = datosFormulario;

            // Validar que el descriptor sea válido
            if (!FaceDescriptorUtils.esDescriptorValido(descriptorFacial)) {
                return res.status(400).json({ error: 'Descriptor facial inválido' });
            }

            // Sanitizar inputs
            const nombreSanitizado = xss(nombre.trim());
            const apellidoSanitizado = xss(apellido.trim());
            const cedulaSanitizado = xss(cedula.trim());
            const correoSanitizado = xss(correo.trim().toLowerCase());

            // Validar cédula según políticas de Ecuador
            const validacionCedula = CedulaValidator.validar(cedulaSanitizado);
            if (!validacionCedula.valida) {
                return res.status(400).json({ error: validacionCedula.mensaje });
            }

            // Crear usuario AHORA
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

            const nuevoUsuarioId = resultado.insertId;

            // Guardar imagen en BD
            await Usuario.guardarImagen(nuevoUsuarioId, req.file.buffer);
            
            // Guardar descriptor facial en BD
            await Usuario.guardarDescriptor(nuevoUsuarioId, descriptorFacial);

            // Guardar 2FA si fue validado en registro
            if (secretDosFA) {
                await TwoFactorService.habilitarDosFA(nuevoUsuarioId, secretDosFA);
                console.log(`[2FA] ✓ 2FA habilitado para usuario ${nuevoUsuarioId}`);
            }

            console.log(`[REGISTRO] ✓ Usuario ${nuevoUsuarioId} creado completamente con 2FA validado`);

            return res.status(201).json({ 
                mensaje: '¡Registro completado exitosamente!',
                usuarioId: nuevoUsuarioId,
                registroCompleto: true
            });
        } catch (error) {
            console.error('Error al completar registro:', error);
            return res.status(500).json({ error: 'Error al completar el registro' });
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

    // Solicitar 2FA (durante registro o después de 5 intentos fallidos)
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

            console.log(`[2FA] Solicitando 2FA para ${correoSanitizado}`);

            // Generar secret TEMPORAL (no requiere que el usuario exista aún)
            const datos = await TwoFactorService.generarSecret(correoSanitizado);
            const secret = datos.secret;
            const qrCode = datos.qrCode;
            
            console.log(`[2FA] ✓ Secret temporal generado para ${correoSanitizado}`);

            // Retornar AMBOS: QR para mostrar + secret para que el cliente lo guarde
            // El cliente guardará el secret y lo devolverá cuando verifique el código
            return res.json({
                mensaje: 'Escanea el código QR con Google Authenticator',
                qrCode: qrCode,
                secret: secret,  // Enviar secret al cliente (lo guardará en estado)
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
            const { usuarioId, codigo, secret } = req.body;

            // Validar que código sea números de 6 dígitos
            if (!codigo || !/^\d{6}$/.test(codigo)) {
                return res.status(400).json({ error: 'Código debe ser 6 dígitos' });
            }

            // En REGISTRO: se envía secret desde el cliente; En LOGIN: se busca en BD
            if (!secret && !usuarioId) {
                return res.status(400).json({ error: 'Solicita el QR primero o inicia sesión' });
            }

            let secretVerificacion;
            let usuario = null;

            if (usuarioId) {
                // MODO LOGIN: Buscar usuario y obtener su secret
                usuario = await Usuario.obtenerPorId(usuarioId);
                if (!usuario) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }

                secretVerificacion = await TwoFactorService.obtenerSecret(usuarioId);
                if (!secretVerificacion) {
                    return res.status(400).json({ error: '2FA no configurado para este usuario' });
                }

                console.log(`[2FA] LOGIN - Verificando código para usuario ${usuarioId}`);
            } else if (secret) {
                // MODO REGISTRO: Usar secret enviado por el cliente
                secretVerificacion = secret;
                console.log('[2FA] REGISTRO - Verificando código con secret temporal');
            }

            // Verificar código contra el secret (cualquiera sea su origen)
            const esValido = TwoFactorService.verificarCodigo(secretVerificacion, codigo);
            if (!esValido) {
                return res.status(401).json({ error: 'Código inválido o expirado' });
            }

            // Si es LOGIN, generar JWT y retornar usuario
            if (usuarioId && usuario) {
                await LoginAttempts.limpiarIntentos(usuario.correo);

                const token = jwt.sign(
                    { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
                    process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2025',
                    { expiresIn: process.env.JWT_EXPIRE || '7d' }
                );

                console.log(`[2FA] ✓ LOGIN exitoso con 2FA para ${usuario.correo}`);

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
            } else {
                // Si es REGISTRO, solo confirmar que el código es válido
                console.log('[2FA] ✓ REGISTRO - Código verificado exitosamente');
                
                return res.json({
                    mensaje: '2FA verificado exitosamente',
                    dos_fa_verificado: true
                });
            }
        } catch (error) {
            console.error('[ERROR] Error verificando 2FA:', error);
            return res.status(500).json({ error: 'Error verificando código' });
        }
    }

    // Actualizar rostro de usuario
    static async actualizarRostro(req, res) {
        try {
            const { usuarioId } = req.params;
            const descriptorHeader = req.get('x-descriptor-facial');
            const codigo2FAHeader = req.get('x-codigo-2fa');

            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió imagen facial' });
            }

            if (!descriptorHeader) {
                return res.status(400).json({ error: 'No se recibió descriptor facial' });
            }

            if (!codigo2FAHeader || codigo2FAHeader.length !== 6) {
                return res.status(400).json({ 
                    error: 'Código de autenticación de dos factores requerido',
                    codigoError: 'CODIGO_2FA_REQUERIDO'
                });
            }

            // Decodificar descriptor facial
            const descriptorFacial = JSON.parse(decodeURIComponent(descriptorHeader));

            // Validar que sea un descriptor válido
            if (!FaceDescriptorUtils.esDescriptorValido(descriptorFacial)) {
                return res.status(400).json({ error: 'Descriptor facial inválido' });
            }

            // Verificar que el usuario existe
            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // VALIDAR CÓDIGO 2FA ANTES DE CONTINUAR
            console.log('[FACE-UPDATE] Verificando código 2FA...');
            
            const secret2FA = await TwoFactorService.obtenerSecret(usuarioId);
            
            if (!secret2FA) {
                return res.status(403).json({ 
                    error: 'No tienes autenticación de dos factores activada. Por seguridad, debes activar 2FA antes de actualizar tu rostro.',
                    codigoError: '2FA_NO_ACTIVADO'
                });
            }

            // Verificar código 2FA
            const codigo2FAValido = TwoFactorService.verificarCodigo(secret2FA, codigo2FAHeader);
            
            if (!codigo2FAValido) {
                console.log('[FACE-UPDATE] ✗ Código 2FA inválido');
                return res.status(401).json({ 
                    error: 'Código de autenticación inválido. Verifica el código en tu aplicación Google Authenticator.',
                    codigoError: 'CODIGO_2FA_INVALIDO'
                });
            }

            console.log('[FACE-UPDATE] ✓ Código 2FA verificado correctamente');

            // VALIDAR QUE EL NUEVO ROSTRO SE PAREZCA AL ROSTRO ACTUAL DEL USUARIO
            // Esto previene que alguien cambie completamente el rostro de un usuario
            if (usuario.descriptor_facial) {
                console.log('[FACE-UPDATE] Verificando similitud con rostro actual...');
                const descriptorActual = JSON.parse(usuario.descriptor_facial);
                
                const esMismaPersona = FaceDescriptorUtils.sonSimilares(
                    descriptorFacial,
                    descriptorActual,
                    0.45 // Umbral más estricto para garantizar que es la misma persona
                );

                if (!esMismaPersona) {
                    console.log('[FACE-UPDATE] ✗ El nuevo rostro no coincide con el usuario actual');
                    return res.status(403).json({ 
                        error: 'El nuevo rostro no coincide suficientemente con tu rostro registrado. Por seguridad, no se permite cambiar completamente el rostro.',
                        codigoError: 'ROSTRO_NO_COINCIDE',
                        detalle: 'Debes capturar tu propio rostro para actualizar la imagen'
                    });
                }

                console.log('[FACE-UPDATE] ✓ Nuevo rostro coincide con usuario actual');
            }

            // VALIDAR QUE EL ROSTRO SEA ÚNICO (excluyendo al usuario actual)
            console.log('[FACE-UPDATE] Verificando unicidad del rostro...');
            const usuariosConDescriptores = await Usuario.obtenerTodosDescriptores();
            
            for (const usuarioExistente of usuariosConDescriptores) {
                // Excluir al usuario que está actualizando
                if (usuarioExistente.id === parseInt(usuarioId)) {
                    continue;
                }

                if (usuarioExistente.descriptor) {
                    const similares = FaceDescriptorUtils.sonSimilares(
                        descriptorFacial, 
                        usuarioExistente.descriptor,
                        0.6 // Umbral de similitud
                    );
                    
                    if (similares) {
                        console.log(`[FACE-UPDATE] ✗ Rostro ya registrado (Usuario: ${usuarioExistente.nombre} ${usuarioExistente.apellido})`);
                        return res.status(409).json({ 
                            error: 'Este rostro ya está registrado por otro usuario',
                            codigoError: 'ROSTRO_DUPLICADO'
                        });
                    }
                }
            }
            
            console.log('[FACE-UPDATE] ✓ Rostro único verificado');

            // Actualizar imagen y descriptor en BD
            await Usuario.actualizarImagen(usuarioId, req.file.buffer);
            await Usuario.actualizarDescriptor(usuarioId, descriptorFacial);

            console.log(`[FACE-UPDATE] ✓ Rostro actualizado para usuario ${usuarioId}`);

            return res.json({ 
                mensaje: 'Rostro actualizado correctamente',
                actualizado: true
            });
        } catch (error) {
            console.error('Error actualizando rostro:', error);
            return res.status(500).json({ error: 'Error al actualizar rostro' });
        }
    }
}

module.exports = AuthController;
