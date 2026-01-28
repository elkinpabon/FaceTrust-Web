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
    guardarImagenFacial: (usuarioId, imagen) => {
        const formData = new FormData();
        formData.append('imagen', imagen);
        return api.post(`/auth/imagen-facial/${usuarioId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    obtenerImagenFacial: (usuarioId) => api.get(`/auth/imagen-facial/${usuarioId}`),
    verificarIdentidad: (usuarioId) => api.post(`/auth/verificar-identidad/${usuarioId}`)
};

// Servicios de Usuarios
export const usuarioService = {
    obtenerPerfil: () => api.get('/usuarios/perfil'),
    actualizarPerfil: (datos) => api.put('/usuarios/perfil', datos),
    obtenerTodos: (filtro) => api.get('/usuarios', { params: { filtro } }),
    obtenerPorId: (usuarioId) => api.get(`/usuarios/${usuarioId}`),
    eliminar: (usuarioId) => api.delete(`/usuarios/${usuarioId}`)
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
