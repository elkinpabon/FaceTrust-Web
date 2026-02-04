import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Lightbulb, Maximize2, Smile, CheckCircle, User } from 'lucide-react';
import { authService } from '../services/api.js';
import FaceScanner from '../components/FaceScanner.jsx';
import Modal2FA from '../components/Modal2FA.jsx';
import ModalFeedback from '../components/ModalFeedback.jsx';
import WaveBackground from '../components/WaveBackground.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/auth.css';

const Registro = () => {
    const [paso, setPaso] = useState(1);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);
    const [registroExitoso, setRegistroExitoso] = useState(false);
    const [mostrarModalError, setMostrarModalError] = useState(false);
    const [mostrarModal2FA, setMostrarModal2FA] = useState(false);
    const [usuarioActual, setUsuarioActual] = useState(null);
    const [errorModal, setErrorModal] = useState({ tipo: 'error', titulo: '', mensaje: '' });
    const [validacionContraseña, setValidacionContraseña] = useState({
        longitud: false,
        mayuscula: false,
        numero: false,
        especial: false
    });
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
        
        // Validar contraseña en tiempo real
        if (name === 'contraseña') {
            setValidacionContraseña({
                longitud: value.length >= 8,
                mayuscula: /[A-Z]/.test(value),
                numero: /\d/.test(value),
                especial: /[@$!%*?&]/.test(value)
            });
        }
    };

    // Limpiar localStorage cuando salga del componente
    useEffect(() => {
        return () => {
            console.log('[REGISTRO] Limpiando datos temporales al salir');
            localStorage.removeItem('datosRegistroTemp');
        };
    }, []);

    // Navegar cuando registro es exitoso (después de 2FA)
    useEffect(() => {
        if (registroExitoso) {
            localStorage.removeItem('datosRegistroTemp');
            const timer = setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [registroExitoso, navigate]);

    const handle2FAExito = (respuesta) => {
        console.log('[REGISTRO] ✓ 2FA completado exitosamente');
        setMostrarModal2FA(false);
        setRegistroExitoso(true);
    };

    const handle2FAError = () => {
        console.log('[REGISTRO] 2FA cancelado');
        setMostrarModal2FA(false);
        setPaso(2);
    };

    const handleRegistroPaso1 = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validar contraseña antes de enviar
        const contraseña = formData.contraseña;
        if (contraseña.length < 8) {
            setError('La contraseña debe tener mínimo 8 caracteres');
            return;
        }
        
        if (!/[A-Z]/.test(contraseña)) {
            setError('La contraseña debe contener al menos una letra mayúscula');
            return;
        }
        
        if (!/\d/.test(contraseña)) {
            setError('La contraseña debe contener al menos un número');
            return;
        }
        
        // En desarrollo acepta cualquier carácter especial, en producción solo los específicos
        const esProduccion = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        if (esProduccion && !/[@$!%*?&]/.test(contraseña)) {
            setError('La contraseña debe contener un carácter especial (@$!%*?&)');
            return;
        }
        
        setCargando(true);

        try {
            // PASO 1: Solo valida datos (SIN crear usuario en BD)
            await authService.registro(formData);
            console.log('[REGISTRO] Paso 1: Validación exitosa');
            localStorage.setItem('datosRegistroTemp', JSON.stringify(formData));
            setPaso(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al validar formulario');
        } finally {
            setCargando(false);
        }
    };

    const handleCapturarRostro = async (blob) => {
        // Bloquear si ya se está procesando
        if (procesando) {
            return;
        }

        setProcesando(true);
        setCargando(true);
        setError('');

        try {
            if (!blob) {
                throw new Error('No se capturó imagen del rostro');
            }
            
            const datosTemp = localStorage.getItem('datosRegistroTemp');
            if (!datosTemp) {
                throw new Error('Datos del formulario no encontrados');
            }
            const datosFormulario = JSON.parse(datosTemp);
            
            // Extraer descriptor facial ANTES de enviar
            console.log('[REGISTRO] Extrayendo descriptor facial...');
            const descriptorFacial = await extraerDescriptorFacial(blob);
            
            if (!descriptorFacial) {
                throw new Error('No se pudo extraer el descriptor facial');
            }
            
            console.log('[REGISTRO] Descriptor facial extraído:', descriptorFacial.length, 'valores');
            console.log('[REGISTRO] Enviando blob (' + blob.size + ' bytes) + descriptor...');
            const tiempoInicio = Date.now();
            
            // Enviar imagen Y descriptor al backend
            const response = await authService.guardarImagenFacial(
                datosFormulario, 
                blob, 
                Array.from(descriptorFacial)
            );
            
            const tiempoTotal = Date.now() - tiempoInicio;
            console.log('[REGISTRO] ✓ Completado en ' + tiempoTotal + 'ms');

            const usuarioId = response.data.usuarioId;
            const correo = datosFormulario.correo;
            const nombre = datosFormulario.nombre;
            const apellido = datosFormulario.apellido;
            
            if (descriptorFacial && usuarioId) {
                localStorage.setItem(`descriptor_${usuarioId}`, JSON.stringify(Array.from(descriptorFacial)));
            }

            // PASO 3: Mostrar modal 2FA para completar registro
            setUsuarioActual({
                id: usuarioId,
                correo: correo,
                nombre: nombre,
                apellido: apellido
            });
            setPaso(3);
            setMostrarModal2FA(true);
        } catch (err) {
            console.error('[REGISTRO] Error:', err);
            
            // Manejar error de rostro duplicado específicamente
            if (err.response?.data?.codigoError === 'ROSTRO_DUPLICADO') {
                setErrorModal({
                    tipo: 'error',
                    titulo: '⚠️ Rostro Duplicado',
                    mensaje: 'Este rostro ya está registrado en el sistema. No se permite registrar la misma cara dos veces. Si crees que esto es un error, por favor contacta al administrador.'
                });
                setMostrarModalError(true);
            } else {
                const mensajeError = err.response?.data?.error || err.message || 'Error en el registro';
                setError(mensajeError);
            }
        } finally {
            setCargando(false);
            setProcesando(false);
        }
    };

    const extraerDescriptorFacial = async (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const img = new Image();
                    img.onload = async () => {
                        const detections = await faceapi
                            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options())
                            .withFaceLandmarks()
                            .withFaceDescriptors();
                        
                        // VALIDACIÓN ANTI-SPOOFING: Detectar múltiples rostros
                        if (detections.length === 0) {
                            reject(new Error('No se detectó rostro en la imagen'));
                            return;
                        }
                        
                        if (detections.length > 1) {
                            console.warn('[REGISTRO] Se detectaron', detections.length, 'rostros');
                            reject(new Error('Se detectaron múltiples rostros. Por favor, asegúrate de estar solo'));
                            return;
                        }
                        
                        // Validación de rostro válido (landmarks detectados correctamente)
                        const landmarks = detections[0].landmarks;
                        if (!landmarks || landmarks.positions.length < 68) {
                            reject(new Error('Rostro no detectado correctamente. Asegúrate de estar frente a la cámara'));
                            return;
                        }
                        
                        console.log('[REGISTRO] Descriptor de rostro extraído con', detections.length, 'rostro(s)');
                        resolve(detections[0].descriptor);
                    };
                    img.src = event.target.result;
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsDataURL(blob);
        });
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
                                    <span className="input-icon"><User size={20} color="#0d7377" /></span>
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
                                    <span className="input-icon"><User size={20} color="#0d7377" /></span>
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
                            
                            {/* Validación de contraseña en tiempo real */}
                            {formData.contraseña && (
                                <>
                                    {/* Barra de fortaleza */}
                                    <div className="strength-bar">
                                        <div 
                                            className={`strength-fill ${
                                                Object.values(validacionContraseña).filter(Boolean).length <= 1 ? 'weak' : 
                                                Object.values(validacionContraseña).filter(Boolean).length <= 2 ? 'fair' : 
                                                Object.values(validacionContraseña).filter(Boolean).length <= 3 ? 'good' : 
                                                'strong'
                                            }`}
                                            style={{
                                                width: `${(Object.values(validacionContraseña).filter(Boolean).length / 4) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <p className="strength-text">
                                        {Object.values(validacionContraseña).filter(Boolean).length === 0 && 'Muy débil'}
                                        {Object.values(validacionContraseña).filter(Boolean).length === 1 && 'Débil'}
                                        {Object.values(validacionContraseña).filter(Boolean).length === 2 && 'Aceptable'}
                                        {Object.values(validacionContraseña).filter(Boolean).length === 3 && 'Buena'}
                                        {Object.values(validacionContraseña).filter(Boolean).length === 4 && '¡Excelente!'}
                                    </p>
                                    
                                    {/* Checklist de requisitos */}
                                    <div className="password-validation">
                                        <div className={`validation-item ${validacionContraseña.longitud ? 'valid' : 'invalid'}`}>
                                            <span className="check-icon">{validacionContraseña.longitud ? '✓' : '✗'}</span>
                                            <span>Mínimo 8 caracteres</span>
                                        </div>
                                        <div className={`validation-item ${validacionContraseña.mayuscula ? 'valid' : 'invalid'}`}>
                                            <span className="check-icon">{validacionContraseña.mayuscula ? '✓' : '✗'}</span>
                                            <span>Una letra mayúscula (A-Z)</span>
                                        </div>
                                        <div className={`validation-item ${validacionContraseña.numero ? 'valid' : 'invalid'}`}>
                                            <span className="check-icon">{validacionContraseña.numero ? '✓' : '✗'}</span>
                                            <span>Un número (0-9)</span>
                                        </div>
                                        <div className={`validation-item ${validacionContraseña.especial ? 'valid' : 'invalid'}`}>
                                            <span className="check-icon">{validacionContraseña.especial ? '✓' : '✗'}</span>
                                            <span>Un carácter especial (@$!%*?&)</span>
                                        </div>
                                    </div>
                                </>
                            )}
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
                                            <div className="instruction-icon">
                                                <Lightbulb size={28} />
                                            </div>
                                            <div className="instruction-text">
                                                <strong>Iluminación</strong>
                                                <p>Estar en un lugar bien iluminado con luz frontal</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">
                                                <Maximize2 size={28} />
                                            </div>
                                            <div className="instruction-text">
                                                <strong>Distancia</strong>
                                                <p>Posiciónate a 30-50 cm de la cámara</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">
                                                <Smile size={28} />
                                            </div>
                                            <div className="instruction-text">
                                                <strong>Expresión Natural</strong>
                                                <p>Rostro relajado, sin accesorios cubriendo</p>
                                            </div>
                                        </li>
                                        <li className="instruction-item">
                                            <div className="instruction-icon">
                                                <CheckCircle size={28} />
                                            </div>
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
                                {error && (
                                    <div className="error-message-scanner">
                                        {error}
                                        {error.includes('Este rostro ya está registrado') && (
                                            <button 
                                                className="auth-button secondary-button"
                                                onClick={() => {
                                                    setError('');
                                                    setPaso(1);
                                                    localStorage.removeItem('datosRegistroTemp');
                                                }}
                                                style={{ marginTop: '15px' }}
                                            >
                                                Volver al Formulario
                                            </button>
                                        )}
                                    </div>
                                )}
                                <FaceScanner 
                                    onCapture={handleCapturarRostro} 
                                    titulo="Captura tu Rostro"
                                    nombreUsuario={`${formData.nombre} ${formData.apellido}`}
                                    activo={!registroExitoso && !procesando && !error}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
            
            <ModalFeedback 
                isOpen={mostrarModalError}
                tipo={errorModal.tipo}
                titulo={errorModal.titulo}
                mensaje={errorModal.mensaje}
                onClose={() => {
                    setMostrarModalError(false);
                    setProcesando(false);
                }}
            />

            {usuarioActual && mostrarModal2FA && (
                <Modal2FA 
                    usuario={usuarioActual}
                    onCerrar={handle2FAError}
                    onExito={handle2FAExito}
                />
            )}
        </>
    );
};

export default Registro;
