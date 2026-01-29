import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import WaveBackground from '../components/WaveBackground.jsx';
import Logo from '../components/Logo.jsx';
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
            <WaveBackground />
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-header">
                        <Logo size={40} />
                        <h1>FACETRUST</h1>
                    </div>
                    <h2>Inicia Sesión</h2>
                    <p className="auth-subtitle">Verifica tu identidad con reconocimiento facial</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                required
                                className="form-input"
                            />
                            <span className="input-icon">@</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Contraseña</label>
                        <div className="input-wrapper">
                            <input
                                type="password"
                                value={contraseña}
                                onChange={(e) => setContraseña(e.target.value)}
                                placeholder="Ingresa tu contraseña"
                                required
                                className="form-input"
                            />
                            <span className="input-icon">●</span>
                        </div>
                    </div>

                    <button type="submit" disabled={cargando} className="auth-button">
                        {cargando ? 'Validando...' : 'Continuar al Escaneo'}
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
