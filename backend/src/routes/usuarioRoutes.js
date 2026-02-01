const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { verificarToken, verificarAdmin } = require('../middleware/autenticacion');

// Obtener perfil del usuario actual
router.get('/perfil', verificarToken, UsuarioController.obtenerPerfil);

// Actualizar perfil
router.put('/perfil', verificarToken, UsuarioController.actualizarPerfil);

// Obtener logs de login (solo admin) - ANTES de rutas con parámetros
router.get('/logs/login', verificarToken, verificarAdmin, UsuarioController.obtenerLogsLogin);

// Obtener historial de cambios (solo admin) - ANTES de rutas con parámetros
router.get('/historial/cambios', verificarToken, verificarAdmin, UsuarioController.obtenerHistorialCambios);

// Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, verificarAdmin, UsuarioController.obtenerTodos);

// Obtener usuario por ID (solo admin) - DESPUÉS de rutas específicas
router.get('/:usuarioId', verificarToken, verificarAdmin, UsuarioController.obtenerPorId);

// Actualizar usuario (solo admin)
router.put('/:usuarioId', verificarToken, verificarAdmin, UsuarioController.actualizar);

// Eliminar usuario (solo admin)
router.delete('/:usuarioId', verificarToken, verificarAdmin, UsuarioController.eliminar);

// Cambiar rol de usuario (solo admin)
router.put('/:usuarioId/rol', verificarToken, verificarAdmin, UsuarioController.cambiarRol);

module.exports = router;
router.put('/:usuarioId/rol', verificarToken, verificarAdmin, UsuarioController.cambiarRol);

module.exports = router;
