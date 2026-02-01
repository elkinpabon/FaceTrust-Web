const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Registro
router.post('/registro', AuthController.registro);

// Login
router.post('/login', AuthController.login);

// Guardar imagen facial
router.post('/imagen-facial/:usuarioId', upload.single('imagen'), AuthController.guardarImagenFacial);

// Obtener imagen facial
router.get('/imagen-facial/:usuarioId', AuthController.obtenerImagenFacial);

// Verificar identidad facial
router.post('/verificar-identidad/:usuarioId', upload.single('imagen'), AuthController.verificarIdentidad);

module.exports = router;
