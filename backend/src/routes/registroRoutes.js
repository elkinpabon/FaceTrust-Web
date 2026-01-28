const express = require('express');
const router = express.Router();
const RegistroController = require('../controllers/RegistroController');
const { verificarToken, verificarAdmin } = require('../middleware/autenticacion');

// Registrar entrada
router.post('/entrada', verificarToken, RegistroController.registrarEntrada);

// Registrar salida
router.post('/salida', verificarToken, RegistroController.registrarSalida);

// Obtener mis registros
router.get('/mis-registros', verificarToken, RegistroController.obtenerMisRegistros);

// Obtener todos los registros (admin)
router.get('/', verificarToken, verificarAdmin, RegistroController.obtenerTodos);

// Obtener registros de usuario específico (admin)
router.get('/usuario/:usuarioId', verificarToken, verificarAdmin, RegistroController.obtenerRegistrosUsuario);

module.exports = router;
