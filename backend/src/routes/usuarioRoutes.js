const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { verificarToken, verificarAdmin } = require('../middleware/autenticacion');

// Obtener perfil del usuario actual
router.get('/perfil', verificarToken, UsuarioController.obtenerPerfil);

// Actualizar perfil
router.put('/perfil', verificarToken, UsuarioController.actualizarPerfil);

// Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, verificarAdmin, UsuarioController.obtenerTodos);

// Obtener usuario por ID (solo admin)
router.get('/:usuarioId', verificarToken, verificarAdmin, UsuarioController.obtenerPorId);

// Eliminar usuario (solo admin)
router.delete('/:usuarioId', verificarToken, verificarAdmin, UsuarioController.eliminar);

module.exports = router;
