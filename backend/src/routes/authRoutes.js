const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rate limiting para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para registro
const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo 3 registros por hora
    message: 'Demasiados registros. Intenta de nuevo más tarde',
    standardHeaders: true,
    legacyHeaders: false,
});

// Registro
router.post('/registro', registroLimiter, AuthController.registro);

// Login
router.post('/login', loginLimiter, AuthController.login);

// Guardar imagen facial
router.post('/imagen-facial/:usuarioId', upload.single('imagen'), AuthController.guardarImagenFacial);

// Obtener imagen facial
router.get('/imagen-facial/:usuarioId', AuthController.obtenerImagenFacial);

// Verificar identidad facial
router.post('/verificar-identidad/:usuarioId', upload.single('imagen'), AuthController.verificarIdentidad);

// Registrar fallo facial
router.post('/registrar-fallo-facial/:usuarioId', AuthController.registrarFalloFacial);

// Solicitar 2FA
router.post('/solicitar-2fa', AuthController.solicitarDosFA);

// Verificar código 2FA
router.post('/verificar-2fa', AuthController.verificarDosFA);

module.exports = router;
