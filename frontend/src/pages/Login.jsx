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
    const [codigo2FA, setCodigo2FA] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [intentosFallidos, setIntentosFallidos] = useState(0);
    const [mostrar2FA, setMostrar2FA] = useState(false);
    const [usuarioId, setUsuarioId] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        try {
            const response = await authService.login(correo, contraseña);
            
            const usuarioData = response.data.usuario;
            const token = response.data.token;

            // Reset intentos si es exitoso
            setIntentosFallidos(0);

            // Si es admin, guardar en context e ir directo
            if (usuarioData.rol === 'admin') {
                login(usuarioData, token);
                navigate('/dashboard-admin');
            } else {
                // Si es usuario normal, guardar temporalmente para validación facial
                localStorage.setItem('usuarioTemporal', JSON.stringify({
                    usuarioId: usuarioData.id,
                    token: token,
                    usuario: usuarioData
                }));
                navigate('/validar-identidad');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al iniciar sesión';
            
            // Si bloqueado para 2FA después de 5 intentos
            if (err.response?.status === 429 && err.response?.data?.bloqueadoPara2FA) {
                setMostrar2FA(true);
                setUsuarioId(err.response?.data?.correo);
                setError('Demasiados intentos. Ingresa tu código de Google Authenticator');
            } else {
                // Contar intentos fallidos
                const nuevoIntento = intentosFallidos + 1;
                setIntentosFallidos(nuevoIntento);

                // Mostrar opción de 2FA después del intento 3
                if (nuevoIntento >= 3) {
                    setError(`${errorMsg}. Te quedan ${5 - nuevoIntento} intentos. O puedes usar Google Authenticator.`);
                    setMostrar2FA(true);
                    setUsuarioId(correo);
                } else {
                    setError(`${errorMsg}. Te quedan ${5 - nuevoIntento} intentos.`);
                }
            }
        } finally {
            setCargando(false);
        }
    };

    const handleVerificar2FA = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        try {
            if (codigo2FA.length !== 6) {
                setError('El código debe tener 6 dígitos');
                setCargando(false);
                return;
            }

            const response = await authService.verificarDosFA({
                usuarioId: usuarioId,
                codigo: codigo2FA
            });

            const usuarioData = response.data.usuario;
            const token = response.data.token;

            // Reset y guardar
            setIntentosFallidos(0);
            setCodigo2FA('');
            login(usuarioData, token);
            
            if (usuarioData.rol === 'admin') {
                navigate('/dashboard-admin');
            } else {
                localStorage.setItem('usuarioTemporal', JSON.stringify({
                    usuarioId: usuarioData.id,
                    token: token,
                    usuario: usuarioData
                }));
                navigate('/validar-identidad');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Código inválido');
            setCodigo2FA('');
        } finally {
            setCargando(false);
        }
    };

    const handleVolver = () => {
        setMostrar2FA(false);
        setError('');
        setCodigo2FA('');
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
                    <h2>{mostrar2FA ? 'Verificación 2FA' : 'Inicia Sesión'}</h2>
                    <p className="auth-subtitle">
                        {mostrar2FA 
                            ? 'Ingresa el código de 6 dígitos de Google Authenticator'
                            : 'Verifica tu identidad con reconocimiento facial'
                        }
                    </p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {!mostrar2FA ? (
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
                            {cargando ? 'Validando...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerificar2FA} className="auth-form">
                        <div className="form-group">
                            <label>Código Google Authenticator</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={codigo2FA}
                                    onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength="6"
                                    required
                                    className="form-input"
                                    style={{letterSpacing: '8px', fontSize: '24px', textAlign: 'center'}}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={cargando || codigo2FA.length !== 6} className="auth-button">
                            {cargando ? 'Verificando...' : 'Verificar Código'}
                        </button>

                        <button 
                            type="button" 
                            onClick={handleVolver}
                            className="auth-button"
                            style={{background: '#f0f0f0', color: '#333', marginTop: '8px'}}
                        >
                            Volver a intentar contraseña
                        </button>
                    </form>
                )}

                <p className="auth-link">
                    ¿No tienes cuenta? <a href="/registro">Regístrate aquí</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
