const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

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

            if (!correo || !contraseña) {
                return res.status(400).json({ error: 'Correo y contraseña requeridos' });
            }

            const usuario = await Usuario.obtenerPorCorreo(correo);
            if (!usuario) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const esValido = await Usuario.verificarContraseña(contraseña, usuario.contraseña);
            if (!esValido) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

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
                    rol: usuario.rol
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            return res.status(500).json({ error: 'Error al iniciar sesión' });
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

            // Aquí se valida si el rostro capturado coincide con el registrado
            // Esta lógica se maneja desde el frontend con face-api.js
            // El backend solo confirma que el usuario intentó validarse

            const usuario = await Usuario.obtenerPorId(usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

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
            console.error('Error al verificar identidad:', error);
            return res.status(500).json({ error: 'Error al verificar identidad' });
        }
    }
}

module.exports = AuthController;
