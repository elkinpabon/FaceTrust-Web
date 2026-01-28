import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        try {
            const response = await authService.login(correo, contraseña);
            
            // Guardar datos y redirigir a validación facial
            localStorage.setItem('usuarioTemporal', JSON.stringify({
                usuarioId: response.data.usuario.id,
                token: response.data.token,
                usuario: response.data.usuario
            }));

            navigate('/validar-identidad');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Reconocimiento Facial</h1>
                <h2>Inicia Sesión</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={contraseña}
                            onChange={(e) => setContraseña(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={cargando} className="auth-button">
                        {cargando ? 'Validando...' : 'Continuar'}
                    </button>
                </form>

                <p className="auth-link">
                    ¿No tienes cuenta? <a href="/registro">Regístrate aquí</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
