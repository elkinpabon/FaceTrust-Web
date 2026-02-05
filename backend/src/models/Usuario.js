const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Usuario {
    // Crear nuevo usuario
    static async crear(datos) {
        try {
            const hashedPassword = await bcrypt.hash(datos.contraseña, 10);
            const { nombre, apellido, cedula, correo, telefono, direccion, rol = 'usuario' } = datos;
            
            const query = `
                INSERT INTO usuarios (nombre, apellido, cedula, correo, contraseña, telefono, direccion, rol, imagen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const [resultado] = await pool.query(query, [nombre, apellido, cedula, correo, hashedPassword, telefono, direccion, rol, null]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Obtener usuario por correo
    static async obtenerPorCorreo(correo) {
        try {
            const query = 'SELECT * FROM usuarios WHERE correo = ?';
            const [resultados] = await pool.query(query, [correo]);
            return resultados[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Obtener usuario por ID
    static async obtenerPorId(id) {
        try {
            const query = 'SELECT id, nombre, apellido, cedula, correo, telefono, direccion, rol, imagen, created_at FROM usuarios WHERE id = ?';
            const [resultados] = await pool.query(query, [id]);
            return resultados[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los usuarios (para admin)
    static async obtenerTodos(filtro = '') {
        try {
            let query = 'SELECT id, nombre, apellido, cedula, correo, telefono, direccion, rol, created_at FROM usuarios';
            if (filtro) {
                query += ` WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ? OR cedula LIKE ?`;
                const termino = `%${filtro}%`;
                const [resultados] = await pool.query(query, [termino, termino, termino, termino]);
                return resultados;
            }
            const [resultados] = await pool.query(query);
            return resultados;
        } catch (error) {
            throw error;
        }
    }

    // Guardar imagen facial
    static async guardarImagen(usuarioId, imagen) {
        try {
            const query = 'UPDATE usuarios SET imagen = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [imagen, usuarioId]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Guardar descriptor facial
    static async guardarDescriptor(usuarioId, descriptor) {
        try {
            const descriptorJSON = JSON.stringify(descriptor);
            const query = 'UPDATE usuarios SET descriptor_facial = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [descriptorJSON, usuarioId]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los descriptores faciales (excepto el del usuario especificado)
    static async obtenerTodosDescriptores(excluirUsuarioId = null) {
        try {
            let query = 'SELECT id, nombre, apellido, correo, descriptor_facial FROM usuarios WHERE descriptor_facial IS NOT NULL';
            const params = [];
            
            if (excluirUsuarioId) {
                query += ' AND id != ?';
                params.push(excluirUsuarioId);
            }
            
            const [resultados] = await pool.query(query, params);
            return resultados.map(usuario => ({
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                descriptor: usuario.descriptor_facial ? JSON.parse(usuario.descriptor_facial) : null
            }));
        } catch (error) {
            throw error;
        }
    }

    // Obtener descriptor facial de un usuario
    static async obtenerDescriptor(usuarioId) {
        try {
            const query = 'SELECT descriptor_facial FROM usuarios WHERE id = ?';
            const [resultados] = await pool.query(query, [usuarioId]);
            const descriptor = resultados[0]?.descriptor_facial;
            return descriptor ? JSON.parse(descriptor) : null;
        } catch (error) {
            throw error;
        }
    }

    // Obtener imagen de usuario
    static async obtenerImagen(usuarioId) {
        try {
            const query = 'SELECT imagen FROM usuarios WHERE id = ?';
            const [resultados] = await pool.query(query, [usuarioId]);
            return resultados[0]?.imagen || null;
        } catch (error) {
            throw error;
        }
    }

    // Actualizar perfil
    static async actualizar(id, datos) {
        try {
            const campos = [];
            const valores = [];

            if (datos.nombre !== undefined) {
                campos.push('nombre = ?');
                valores.push(datos.nombre);
            }
            if (datos.apellido !== undefined) {
                campos.push('apellido = ?');
                valores.push(datos.apellido);
            }
            if (datos.telefono !== undefined) {
                campos.push('telefono = ?');
                valores.push(datos.telefono);
            }
            if (datos.direccion !== undefined) {
                campos.push('direccion = ?');
                valores.push(datos.direccion);
            }
            if (datos.correo !== undefined) {
                campos.push('correo = ?');
                valores.push(datos.correo);
            }

            if (campos.length === 0) {
                return { affectedRows: 0 };
            }

            valores.push(id);
            const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
            const [resultado] = await pool.query(query, valores);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Verificar contraseña
    static async verificarContraseña(contraseña, hash) {
        return await bcrypt.compare(contraseña, hash);
    }

    // Verificar si correo existe
    static async existeCorreo(correo, excluirId = null) {
        try {
            let query = 'SELECT id FROM usuarios WHERE correo = ?';
            const params = [correo];
            if (excluirId) {
                query += ' AND id != ?';
                params.push(excluirId);
            }
            const [resultados] = await pool.query(query, params);
            return resultados.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Verificar si cédula existe
    static async existeCedula(cedula, excluirId = null) {
        try {
            let query = 'SELECT id FROM usuarios WHERE cedula = ?';
            const params = [cedula];
            if (excluirId) {
                query += ' AND id != ?';
                params.push(excluirId);
            }
            const [resultados] = await pool.query(query, params);
            return resultados.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Eliminar usuario (solo admin)
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM usuarios WHERE id = ?';
            const [resultado] = await pool.query(query, [id]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Actualizar rol de usuario
    static async actualizarRol(id, rolNuevo) {
        try {
            const query = 'UPDATE usuarios SET rol = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [rolNuevo, id]);
            return resultado;
        } catch (error) {
            throw error;
        }
    }

    // Actualizar imagen facial
    static async actualizarImagen(usuarioId, imagen) {
        try {
            const query = 'UPDATE usuarios SET imagen = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [imagen, usuarioId]);
            console.log(`[✓ BD] Imagen actualizada para usuario ${usuarioId}`);
            return resultado;
        } catch (error) {
            console.error('[✗ BD] Error actualizando imagen:', error.message);
            throw error;
        }
    }

    // Actualizar descriptor facial
    static async actualizarDescriptor(usuarioId, descriptor) {
        try {
            const query = 'UPDATE usuarios SET descriptor_facial = ? WHERE id = ?';
            const [resultado] = await pool.query(query, [JSON.stringify(descriptor), usuarioId]);
            console.log(`[✓ BD] Descriptor actualizado para usuario ${usuarioId}`);
            return resultado;
        } catch (error) {
            console.error('[✗ BD] Error actualizando descriptor:', error.message);
            throw error;
        }
    }
}

module.exports = Usuario;
