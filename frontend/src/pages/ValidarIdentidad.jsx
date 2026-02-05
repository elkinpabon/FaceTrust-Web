import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Lock, CheckCircle, Camera } from 'lucide-react';
import { authService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import FaceScanner from '../components/FaceScanner.jsx';
import WaveBackground from '../components/WaveBackground.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/auth.css';

const ValidarIdentidad = () => {
    const [estado, setEstado] = useState('escaneando');
    const [mensaje, setMensaje] = useState('');
    const [datosUsuario, setDatosUsuario] = useState(null);
    const [intentosFacial, setIntentosFacial] = useState(0);
    const [codigo2FA, setCodigo2FA] = useState('');
    const [validando2FA, setValidando2FA] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const MAX_INTENTOS_FACIAL = 3;

    useEffect(() => {
        const datos = localStorage.getItem('usuarioTemporal');
        if (datos) {
            setDatosUsuario(JSON.parse(datos));
        }
    }, []);

    const handleCapturarRostro = async (blob) => {
        // Si ya llegó a 3 intentos fallidos, no permitir más escaneos
        if (intentosFacial >= MAX_INTENTOS_FACIAL) {
            setEstado('error');
            setMensaje('❌ Límite de intentos de escaneo facial excedido. Por favor, usa Google Authenticator para continuar.');
            return;
        }

        setEstado('validando');
        setMensaje('Validando tu identidad...');
        const nuevoIntento = intentosFacial + 1;
        setIntentosFacial(nuevoIntento);

        try {
            const datosTemporales = JSON.parse(localStorage.getItem('usuarioTemporal'));
            
            console.log('[VALIDAR] Intento:', nuevoIntento, 'de', MAX_INTENTOS_FACIAL);
            console.log('[VALIDAR] Blob size:', blob ? blob.size : 'NO HAY BLOB');

            if (!blob) {
                throw new Error('No se capturó imagen facial');
            }

            if (blob.size < 1000) {
                throw new Error('Imagen muy pequeña: ' + blob.size + ' bytes');
            }

            const descriptorCapturado = await extraerDescriptorFacial(blob);
            
            if (!descriptorCapturado) {
                throw new Error('No se pudo extraer descriptor facial de la imagen capturada');
            }

            const descriptorAlmacenado = localStorage.getItem(`descriptor_${datosTemporales.usuario.id}`);
            
            if (!descriptorAlmacenado) {
                console.warn('[VALIDAR] Descriptor almacenado no encontrado, permitiendo login');
            } else {
                const descriptorAlmacenadoArray = JSON.parse(descriptorAlmacenado);
                const distancia = faceapi.euclideanDistance(descriptorCapturado, descriptorAlmacenadoArray);
                
                // Threshold más restrictivo para evitar falsos positivos (lentes, maquillaje, etc)
                const THRESHOLD = 0.45; // Antes era 0.6 - más preciso
                console.log('[VALIDAR] Distancia euclidiana:', distancia.toFixed(4), '| Threshold:', THRESHOLD);
                
                if (distancia > THRESHOLD) {
                    console.error('[VALIDAR] Rostro no coincide. Distancia:', distancia);
                    
                    try {
                        await authService.registrarFalloFacial(datosTemporales.usuario.id);
                    } catch (err) {
                        console.error('[VALIDAR] Error registrando fallo:', err);
                    }

                    setEstado('error');
                    
                    // Si es el último intento, indicar que debe usar 2FA
                    if (nuevoIntento >= MAX_INTENTOS_FACIAL) {
                        setMensaje(`Intento ${nuevoIntento}/${MAX_INTENTOS_FACIAL} fallido. Límite excedido. Por favor, usa Google Authenticator para continuar.`);
                    } else {
                        setMensaje(`Rostro no reconocido. Intento ${nuevoIntento}/${MAX_INTENTOS_FACIAL}. Te quedan ${MAX_INTENTOS_FACIAL - nuevoIntento} intento(s).`);
                    }
                    return;
                }
                
                console.log('[VALIDAR] Rostro validado correctamente');
            }

            const response = await authService.verificarIdentidad(datosTemporales.usuario.id, blob);

            if (response && response.data && response.data.token) {
                setEstado('exito');
                setMensaje('Identidad verificada correctamente');

                login(response.data.usuario, response.data.token);
                localStorage.removeItem('usuarioTemporal');

                setTimeout(() => {
                    if (response.data.usuario.rol === 'admin') {
                        navigate('/dashboard-admin');
                    } else {
                        navigate('/dashboard-usuario');
                    }
                }, 1500);
            } else {
                const errorMsg = response.data?.error || 'Respuesta inválida del servidor';
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('[VALIDAR] Error en validación:', error);
            
            setEstado('error');
            const mensajeError = error.response?.data?.error || error.message || 'No pudimos verificar tu identidad. Intenta nuevamente.';
            setMensaje(mensajeError);
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
                            console.warn('[VALIDAR] Se detectaron', detections.length, 'rostros');
                            reject(new Error('Se detectaron múltiples rostros. Por favor, asegúrate de estar solo'));
                            return;
                        }
                        
                        // Validación de rostro válido (landmarks detectados correctamente)
                        const landmarks = detections[0].landmarks;
                        if (!landmarks || landmarks.positions.length < 68) {
                            reject(new Error('Rostro no detectado correctamente. Asegúrate de estar frente a la cámara'));
                            return;
                        }
                        
                        console.log('[VALIDAR] Descriptor de rostro extraído con', detections.length, 'rostro(s)');
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

    const handleVerificar2FA = async (e) => {
        e.preventDefault();
        setValidando2FA(true);

        try {
            const datosTemporales = JSON.parse(localStorage.getItem('usuarioTemporal'));
            
            if (!codigo2FA || codigo2FA.length !== 6) {
                throw new Error('El código debe tener 6 dígitos');
            }

            console.log('[2FA] Verificando código para usuario:', datosTemporales.usuario.id);
            
            const response = await authService.verificarDosFA({
                usuarioId: datosTemporales.usuario.id,
                codigo: codigo2FA
            });

            if (response && response.data && response.data.token) {
                setEstado('exito');
                setMensaje('2FA verificado correctamente');

                login(response.data.usuario, response.data.token);
                localStorage.removeItem('usuarioTemporal');

                setTimeout(() => {
                    if (response.data.usuario.rol === 'admin') {
                        navigate('/dashboard-admin');
                    } else {
                        navigate('/dashboard-usuario');
                    }
                }, 1500);
            } else {
                throw new Error('Respuesta inválida del servidor');
            }

        } catch (error) {
            console.error('[2FA] Error:', error);
            setMensaje(error.response?.data?.error || error.message || 'Código inválido');
            setCodigo2FA('');
        } finally {
            setValidando2FA(false);
        }
    };

    return (
        <>
            {estado === 'escaneando' ? (
                <div className="fullscreen-scanner-container">
                    <div className="scanner-top-bar">
                        <div className="scanner-logo-header">
                            <Logo size={32} />
                            <h1>FACETRUST</h1>
                        </div>
                        <p className="scanner-subtitle">Análisis Facial - Escanea tu rostro para verificación</p>
                    </div>
                    <div className="scanner-content">
                        <FaceScanner 
                            onCapture={handleCapturarRostro} 
                            titulo="Escanear tu Rostro"
                            nombreUsuario={datosUsuario?.usuario?.nombre}
                        />
                    </div>
                </div>
            ) : (
                <div className="auth-container">
                    <WaveBackground />
                    <div className="auth-card">
                        <div className="auth-header">
                            <div className="logo-header">
                                <Logo size={40} />
                                <h1>FACETRUST</h1>
                            </div>
                            <h2>Verificación Facial</h2>
                            <p className="auth-subtitle">Confirma tu identidad para continuar</p>
                            {intentosFacial > 0 && intentosFacial <= MAX_INTENTOS_FACIAL && (
                                <p style={{ color: '#f59e0b', fontSize: '14px', margin: '10px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Camera size={16} />
                                    Intentos: {intentosFacial}/{MAX_INTENTOS_FACIAL}
                                </p>
                            )}
                        </div>

                        {estado === 'validando' ? (
                            <div className="validation-message">
                                <p>{mensaje}</p>
                                <div className="spinner"></div>
                            </div>
                        ) : estado === 'ingresar2fa' ? (
                            <div className="form-container">
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                    <Lock size={48} color="#0d7377" />
                                </div>
                                <h3 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>Ingresa tu código 2FA</h3>
                                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                                    {datosUsuario?.usuario?.nombre}, por favor ingresa el código de 6 dígitos de tu autenticador
                                </p>
                                <form onSubmit={handleVerificar2FA} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            maxLength="6"
                                            placeholder="000000"
                                            value={codigo2FA}
                                            onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, ''))}
                                            disabled={validando2FA}
                                            style={{
                                                textAlign: 'center',
                                                fontSize: '24px',
                                                letterSpacing: '5px',
                                                fontWeight: 'bold',
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #ddd',
                                                borderRadius: '8px',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>
                                    {mensaje && (
                                        <p style={{ color: '#e74c3c', textAlign: 'center', marginBottom: '10px' }}>
                                            {mensaje}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={validando2FA || codigo2FA.length !== 6}
                                        className="auth-button"
                                    >
                                        {validando2FA ? 'Verificando...' : 'Verificar Código'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEstado('escaneando')}
                                        disabled={validando2FA}
                                        className="auth-button-secondary"
                                        style={{ 
                                            backgroundColor: '#666',
                                            border: '1px solid #888'
                                        }}
                                    >
                                        Volver al Escaneo Facial
                                    </button>
                                </form>
                            </div>
                        ) : estado === 'exito' ? (
                            <div className="success-modal">
                                <div className="success-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                    <CheckCircle size={48} color="#22c55e" />
                                </div>
                                <h2>Bienvenido</h2>
                                <p className="welcome-name">{datosUsuario?.usuario?.nombre}</p>
                                <p className="success-message">Tu identidad ha sido verificada correctamente</p>
                                <div className="loading-spinner"></div>
                            </div>
                        ) : (
                            <div className="error-message-large">
                                <p>{mensaje}</p>
                                <div className="button-group" style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                    {intentosFacial < MAX_INTENTOS_FACIAL && (
                                        <button 
                                            onClick={() => setEstado('escaneando')}
                                            className="auth-button"
                                        >
                                            Reintentar Escaneo
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setEstado('ingresar2fa');
                                            setCodigo2FA('');
                                            setMensaje('');
                                        }}
                                        className="auth-button-secondary"
                                        style={{ 
                                            backgroundColor: '#666',
                                            border: '1px solid #888'
                                        }}
                                    >
                                        {intentosFacial >= MAX_INTENTOS_FACIAL ? 'Usar Google Authenticator (Obligatorio)' : 'Usar Código 2FA'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ValidarIdentidad;
