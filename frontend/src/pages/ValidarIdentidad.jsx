import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { authService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import FaceScanner from '../components/FaceScanner.jsx';
import WaveBackground from '../components/WaveBackground.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/auth.css';

const ValidarIdentidad = () => {
    const [estado, setEstado] = useState('escaneando'); // escaneando, validando, exito, error
    const [mensaje, setMensaje] = useState('');
    const [datosUsuario, setDatosUsuario] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const datos = localStorage.getItem('usuarioTemporal');
        if (datos) {
            setDatosUsuario(JSON.parse(datos));
        }
    }, []);

    const handleCapturarRostro = async (blob) => {
        setEstado('validando');
        setMensaje('Validando tu identidad...');

        try {
            const datosTemporales = JSON.parse(localStorage.getItem('usuarioTemporal'));
            
            console.log('[VALIDAR] Blob recibido:', blob);
            console.log('[VALIDAR] Blob size:', blob ? blob.size : 'NO HAY BLOB');
            console.log('[VALIDAR] Usuario ID:', datosTemporales.usuario.id);

            if (!blob) {
                throw new Error('No se capturó imagen facial');
            }

            if (blob.size < 1000) {
                throw new Error('Imagen muy pequeña: ' + blob.size + ' bytes');
            }

            // Extraer descriptor facial de la imagen capturada
            console.log('[VALIDAR] Extrayendo descriptor facial...');
            const descriptorCapturado = await extraerDescriptorFacial(blob);
            
            if (!descriptorCapturado) {
                throw new Error('No se pudo extraer descriptor facial de la imagen capturada');
            }

            console.log('[VALIDAR] Descriptor capturado extraído');

            // Obtener descriptor almacenado
            const descriptorAlmacenado = localStorage.getItem(`descriptor_${datosTemporales.usuario.id}`);
            
            if (!descriptorAlmacenado) {
                console.warn('[VALIDAR] Descriptor almacenado no encontrado, permitiendo login (usuario registrado antes de actualización)');
                // Si no hay descriptor almacenado, permitir login (usuario registrado antes)
            } else {
                // Comparar descriptores
                const descriptorAlmacenadoArray = JSON.parse(descriptorAlmacenado);
                const distancia = faceapi.euclideanDistance(descriptorCapturado, descriptorAlmacenadoArray);
                
                console.log('[VALIDAR] Distancia euclidiana:', distancia);
                
                // Si la distancia es mayor a 0.6, es un rostro diferente
                if (distancia > 0.6) {
                    console.error('[VALIDAR] Rostro no coincide. Distancia:', distancia);
                    throw new Error('Este no es tu rostro. Por favor intenta nuevamente.');
                }
                
                console.log('[VALIDAR] Rostro validado correctamente');
            }

            // Enviar blob al backend para registro adicional
            const response = await authService.verificarIdentidad(datosTemporales.usuario.id, blob);
            
            console.log('[VALIDAR] Respuesta del servidor:', response);

            if (response && response.data && response.data.token) {
                setEstado('exito');
                setMensaje('Identidad verificada correctamente');

                // Guardar sesión con el nuevo token
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
            console.error('[VALIDAR] Error en validación DETALLADO:', error);
            console.error('[VALIDAR] Error response:', error.response);
            console.error('[VALIDAR] Error message:', error.message);
            
            // Si es error de validación facial, registrarlo en backend
            if (error.message && error.message.includes('Este no es tu rostro')) {
                try {
                    const datosTemporales = JSON.parse(localStorage.getItem('usuarioTemporal'));
                    await authService.registrarFalloFacial(datosTemporales.usuario.id);
                    console.log('[VALIDAR] Fallo facial registrado en backend');
                } catch (regErr) {
                    console.error('[VALIDAR] Error registrando fallo facial:', regErr);
                }
            }
            
            setEstado('error');
            setMensaje(error.response?.data?.error || error.message || 'No pudimos verificar tu identidad. Intenta nuevamente.');
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
                        
                        if (detections.length > 0) {
                            console.log('[VALIDAR] Descriptor de rostro extraído');
                            resolve(detections[0].descriptor);
                        } else {
                            reject(new Error('No se detectó rostro en la imagen'));
                        }
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
                        </div>

                        {estado === 'validando' ? (
                            <div className="validation-message">
                                <p>{mensaje}</p>
                                <div className="spinner"></div>
                            </div>
                        ) : estado === 'exito' ? (
                            <div className="success-modal">
                                <div className="success-icon">✓</div>
                                <h2>Bienvenido</h2>
                                <p className="welcome-name">{datosUsuario?.usuario?.nombre}</p>
                                <p className="success-message">Tu identidad ha sido verificada correctamente</p>
                                <div className="loading-spinner"></div>
                            </div>
                        ) : (
                            <div className="error-message-large">
                                <p>{mensaje}</p>
                                <button onClick={() => window.location.reload()}>Intentar de Nuevo</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ValidarIdentidad;
