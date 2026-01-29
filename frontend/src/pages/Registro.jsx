import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import FaceScanner from '../components/FaceScanner.jsx';
import WaveBackground from '../components/WaveBackground.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/auth.css';

const Registro = () => {
    const [paso, setPaso] = useState(1);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);
    const [registroExitoso, setRegistroExitoso] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        cedula: '',
        correo: '',
        contraseña: '',
        telefono: '',
        direccion: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleRegistroPaso1 = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const response = await authService.registro(formData);
            localStorage.setItem('usuarioRegistroId', response.data.usuarioId);
            setPaso(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar');
        } finally {
            setCargando(false);
        }
    };

    const handleCapturarRostro = async (blob) => {
        setCargando(true);
        setError('');

        try {
            const usuarioId = localStorage.getItem('usuarioRegistroId');
            await authService.guardarImagenFacial(usuarioId, blob);

            localStorage.removeItem('usuarioRegistroId');
            setRegistroExitoso(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar imagen facial');
            setCargando(false);
        }
    };

    return (
        <>
            {registroExitoso && (
                <div className="modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">✓</div>
                        <h2>¡Registro Completado!</h2>
                        <p className="welcome-name">{formData.nombre} {formData.apellido}</p>
                        <p className="success-message">Tu identidad facial ha sido verificada correctamente. Tu cuenta ha sido creada con éxito.</p>
                        <button 
                            className="auth-button"
                            onClick={() => navigate('/login')}
                        >
                            Ir a Iniciar Sesión
                        </button>
                    </div>
                </div>
            )}

            {paso === 1 ? (
                <div className="auth-container">
                    <WaveBackground />
                    <div className="auth-card">
                        <div className="auth-header">
                            <div className="logo-header">
                                <Logo size={40} />
                                <h1>FACETRUST</h1>
                            </div>
                            <h2>Crear Cuenta</h2>
                            <p className="auth-subtitle"></p>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleRegistroPaso1} className="auth-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        placeholder="Tu nombre"
                                        required
                                        className="form-input"
                                    />
                                    <span className="input-icon">👤</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        name="apellido"
                                        value={formData.apellido}
                                        onChange={handleInputChange}
                                        placeholder="Tu apellido"
                                        required
                                        className="form-input"
                                    />
                                    <span className="input-icon">👤</span>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Cédula</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    name="cedula"
                                    value={formData.cedula}
                                    onChange={handleInputChange}
                                    placeholder="Tu número de cédula"
                                    required
                                    className="form-input"
                                />
                                <span className="input-icon">#</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Correo Electrónico</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    name="correo"
                                    value={formData.correo}
                                    onChange={handleInputChange}
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
                                    name="contraseña"
                                    value={formData.contraseña}
                                    onChange={handleInputChange}
                                    placeholder="Crea una contraseña segura"
                                    required
                                    className="form-input"
                                />
                                <span className="input-icon">●</span>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Teléfono</label>
                                <div className="input-wrapper">
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={formData.telefono}
                                        placeholder="Tu teléfono"
                                        onChange={handleInputChange}
                                        className="form-input"
                                    />
                                    <span className="input-icon">☎</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={formData.direccion}
                                        placeholder="Tu dirección"
                                        onChange={handleInputChange}
                                        className="form-input"
                                    />
                                    <span className="input-icon">📍</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={cargando} className="auth-button">
                            {cargando ? 'Registrando...' : 'Continuar al Escaneo'}
                        </button>
                    </form>

                    <p className="auth-link">
                        ¿Ya tienes cuenta? <a href="/login">Inicia sesión aquí</a>
                    </p>
                </div>
            </div>
            ) : (
                <>
                    {mostrarInstrucciones && (
                        <div className="modal-overlay">
                            <div className="instructions-modal">
                                <div className="instructions-header">
                                    <Logo size={40} />
                                    <h2>Captura tu Rostro</h2>
                                    <p className="instructions-subtitle">Sigue estas recomendaciones para un mejor resultado</p>
                                </div>
                                
                                <div className="instructions-content">
                                    <ul className="instructions-list">
                                        <li className="instruction-item">
                                            <div className="instruction-icon">💡</div>
                                            <div className="instruction-text">
                                                <strong>Iluminación</strong>
                                                <p>Estar en un lugar bien iluminado con luz frontal</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">📏</div>
                                            <div className="instruction-text">
                                                <strong>Distancia</strong>
                                                <p>Posiciónate a 30-50 cm de la cámara</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">😊</div>
                                            <div className="instruction-text">
                                                <strong>Expresión Natural</strong>
                                                <p>Rostro relajado, sin accesorios cubriendo</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">✓</div>
                                            <div className="instruction-text">
                                                <strong>Captura Automática</strong>
                                                <p>El sistema detecta y captura al reconocerte</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <button 
                                    className="auth-button"
                                    onClick={() => setMostrarInstrucciones(false)}
                                >
                                    Comenzar Captura
                                </button>
                            </div>
                        </div>
                    )}

                    {!mostrarInstrucciones && (
                        <div className="fullscreen-scanner-container">
                            <div className="scanner-top-bar">
                                <div className="scanner-logo-header">
                                    <Logo size={32} />
                                    <h1>FACETRUST</h1>
                                </div>
                                <p className="scanner-subtitle">Análisis Facial - Captura tu rostro para completar el registro</p>
                            </div>
                            <div className="scanner-content">
                                <FaceScanner 
                                    onCapture={handleCapturarRostro} 
                                    titulo="Captura tu Rostro"
                                    nombreUsuario={`${formData.nombre} ${formData.apellido}`}
                                    activo={!registroExitoso}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default Registro;
