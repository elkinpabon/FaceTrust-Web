import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Servicios de Autenticación
export const authService = {
    registro: (datos) => api.post('/auth/registro', datos),
    login: (correo, contraseña) => api.post('/auth/login', { correo, contraseña }),
    guardarImagenFacial: (datos, imagen, descriptorFacial) => {
        const formData = new FormData();
        // Agregar solo la imagen al FormData
        formData.append('imagen', imagen, 'rostro.jpg');
        
        // Enviar datos del formulario y descriptor en headers personalizados
        return api.post('/auth/imagen-facial', formData, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                'x-registro-datos': encodeURIComponent(JSON.stringify(datos)),
                'x-descriptor-facial': encodeURIComponent(JSON.stringify(descriptorFacial))
            }
        });
    },
    completarRegistro: (datos, imagen, descriptorFacial, secretDosFA) => {
        const formData = new FormData();
        formData.append('imagen', imagen, 'rostro.jpg');
        
        const headers = { 
            'Content-Type': 'multipart/form-data',
            'x-registro-datos': encodeURIComponent(JSON.stringify(datos)),
            'x-descriptor-facial': encodeURIComponent(JSON.stringify(descriptorFacial))
        };
        
        // Si hay secret 2FA, pasarlo en header
        if (secretDosFA) {
            headers['x-dos-fa-secret'] = secretDosFA;
        }
        
        return api.post('/auth/completar-registro', formData, { headers });
    },
    obtenerImagenFacial: (usuarioId) => api.get(`/auth/imagen-facial/${usuarioId}`),
    verificarIdentidad: (usuarioId, blob) => {
        console.log('[API] verificarIdentidad llamado');
        console.log('[API] usuarioId:', usuarioId);
        console.log('[API] blob:', blob ? 'SI - ' + blob.size + ' bytes' : 'NO');
        
        const formData = new FormData();
        if (blob) {
            formData.append('imagen', blob, 'rostro.jpg');
            console.log('[API] FormData creado con blob');
        }
        
        console.log('[API] Enviando POST a:', `/auth/verificar-identidad/${usuarioId}`);
        return api.post(`/auth/verificar-identidad/${usuarioId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    registrarFalloFacial: (usuarioId) => {
        console.log('[API] registrarFalloFacial llamado para usuarioId:', usuarioId);
        return api.post(`/auth/registrar-fallo-facial/${usuarioId}`);
    },
    solicitarDosFA: (datos) => {
        console.log('[API] solicitarDosFA llamado para:', datos.correo);
        return api.post('/auth/solicitar-2fa', datos);
    },
    verificarDosFA: (datos) => {
        console.log('[API] verificarDosFA llamado para usuarioId:', datos.usuarioId);
        return api.post('/auth/verificar-2fa', datos);
    },
    actualizarRostro: (usuarioId, imagen, descriptorFacial, codigo2FA, soloAutenticador = false) => {
        const formData = new FormData();
        
        // Si no está en modo "solo autenticador", incluir la imagen y descriptor
        if (!soloAutenticador && imagen) {
            formData.append('imagen', imagen, 'rostro.jpg');
        }
        
        const headers = {
            'Content-Type': 'multipart/form-data',
            'x-codigo-2fa': codigo2FA || ''
        };
        
        // Si no está en modo solo autenticador, incluir descriptor
        if (!soloAutenticador && descriptorFacial) {
            headers['x-descriptor-facial'] = encodeURIComponent(JSON.stringify(descriptorFacial));
        }
        
        // Pasar flag al backend indicando que es "solo autenticador"
        if (soloAutenticador) {
            headers['x-solo-autenticador'] = 'true';
        }
        
        return api.put(`/auth/actualizar-rostro/${usuarioId}`, formData, { headers });
    },
    obtenerDescriptorActual: (usuarioId) => {
        return api.get(`/auth/descriptor-actual/${usuarioId}`);
    }
};

// Servicios de Usuarios
export const usuarioService = {
    obtenerPerfil: () => api.get('/usuarios/perfil'),
    actualizarPerfil: (datos) => api.put('/usuarios/perfil', datos),
    obtenerTodos: (filtro) => api.get('/usuarios', { params: { filtro } }),
    obtenerPorId: (usuarioId) => api.get(`/usuarios/${usuarioId}`),
    actualizar: (usuarioId, datos) => api.put(`/usuarios/${usuarioId}`, datos),
    eliminar: (usuarioId) => api.delete(`/usuarios/${usuarioId}`),
    obtenerLogsLogin: () => api.get('/usuarios/logs/login'),
    obtenerHistorialCambios: () => api.get('/usuarios/historial/cambios')
};

// Servicios de Registros
export const registroService = {
    registrarEntrada: () => api.post('/registros/entrada'),
    registrarSalida: () => api.post('/registros/salida'),
    obtenerMisRegistros: (fechaInicio, fechaFin) => 
        api.get('/registros/mis-registros', { params: { fechaInicio, fechaFin } }),
    obtenerTodos: (fechaInicio, fechaFin) => 
        api.get('/registros', { params: { fechaInicio, fechaFin } }),
    obtenerRegistrosUsuario: (usuarioId, fechaInicio, fechaFin) => 
        api.get(`/registros/usuario/${usuarioId}`, { params: { fechaInicio, fechaFin } })
};

export default api;
