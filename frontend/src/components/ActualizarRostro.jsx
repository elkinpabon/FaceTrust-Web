import React, { useState } from 'react';
import { X } from 'lucide-react';
import { authService } from '../services/api.js';
import FaceScanner from './FaceScanner.jsx';
import * as faceapi from 'face-api.js';
import '../styles/modal.css';

const ActualizarRostro = ({ isOpen, onClose, usuarioId, nombreUsuario, onActualizacionExitosa }) => {
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);
    const [paso, setPaso] = useState(1); // 1: captura rostro, 2: código 2FA
    const [blobTemporal, setBlobTemporal] = useState(null);
    const [descriptorTemporal, setDescriptorTemporal] = useState(null);
    const [codigo2FA, setCodigo2FA] = useState('');

    const handleCapturarRostro = async (blob) => {
        if (procesando) return;

        setProcesando(true);
        setError('');

        try {
            if (!blob) {
                throw new Error('No se capturó correctamente el rostro');
            }

            // Extraer descriptor facial del blob
            console.log('[UPDATE-ROSTRO] Extrayendo descriptor facial...');
            const descriptor = await extraerDescriptorFacial(blob);

            if (!descriptor) {
                throw new Error('No se pudo extraer el descriptor facial');
            }

            // Guardar temporalmente y pasar al paso de 2FA
            setBlobTemporal(blob);
            setDescriptorTemporal(descriptor);
            setPaso(2);
            console.log('[UPDATE-ROSTRO] Rostro capturado, esperando código 2FA...');

        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error:', error);
            
            if (error.response?.data?.codigoError === '2FA_NO_ACTIVADO') {
                setError('Debes activar la autenticación de dos factores antes de poder actualizar tu rostro. Ve a tu perfil para activar 2FA.');
            } else {
                setError(error.message || 'Error al capturar rostro');
            }
        } finally {
            setProcesando(false);
        }
    };

    const handleActualizarConCodigo2FA = async (e) => {
        e.preventDefault();
        
        if (!codigo2FA || codigo2FA.length !== 6) {
            setError('El código debe tener 6 dígitos');
            return;
        }

        setProcesando(true);
        setError('');

        try {
            console.log('[UPDATE-ROSTRO] Actualizando rostro con validación 2FA...');
            await authService.actualizarRostro(
                usuarioId, 
                blobTemporal, 
                Array.from(descriptorTemporal),
                codigo2FA
            );

            console.log('[UPDATE-ROSTRO] Rostro actualizado exitosamente');
            setExito(true);

            setTimeout(() => {
                setExito(false);
                setPaso(1);
                setCodigo2FA('');
                onActualizacionExitosa && onActualizacionExitosa();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error:', error);
            
            // Manejar errores específicos
            if (error.response?.data?.codigoError === 'ROSTRO_NO_COINCIDE') {
                setError('⚠️ Rostro no reconocido: El rostro capturado no coincide con tu identidad registrada. Por seguridad, debes usar tu propio rostro.');
            } else if (error.response?.data?.codigoError === 'ROSTRO_DUPLICADO') {
                setError('Este rostro ya está registrado por otro usuario en el sistema.');
            } else if (error.response?.data?.codigoError === 'CODIGO_2FA_INVALIDO') {
                setError('Código 2FA inválido. Verifica el código en tu aplicación Google Authenticator.');
            } else if (error.response?.data?.codigoError === '2FA_NO_ACTIVADO') {
                setError('Debes activar la autenticación de dos factores antes de poder actualizar tu rostro. Ve a tu perfil para activar 2FA.');
            } else {
                setError(error.response?.data?.error || error.message || 'Error al actualizar rostro');
            }
        } finally {
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
                        
                        if (detections.length === 0) {
                            reject(new Error('No se detectó rostro en la imagen'));
                            return;
                        }
                        
                        if (detections.length > 1) {
                            reject(new Error('Se detectaron múltiples rostros'));
                            return;
                        }
                        
                        const landmarks = detections[0].landmarks;
                        if (!landmarks || landmarks.positions.length < 68) {
                            reject(new Error('Rostro no detectado correctamente'));
                            return;
                        }
                        
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

    const cerrarModal = () => {
        setError('');
        setExito(false);
        setProcesando(false);
        setPaso(1);
        setCodigo2FA('');
        setBlobTemporal(null);
        setDescriptorTemporal(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>Actualizar Rostro</h2>
                    <p className="modal-subtitle">{nombreUsuario}</p>
                    <button onClick={cerrarModal} className="close-button">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {exito ? (
                        <div className="success-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div className="success-icon" style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                            <h3 style={{ color: '#22c55e', marginBottom: '10px' }}>¡Rostro Actualizado!</h3>
                            <p>El rostro se ha actualizado correctamente</p>
                        </div>
                    ) : paso === 1 ? (
                        <div style={{ padding: '10px 0' }}>
                            {error && (
                                <div className="error-message" style={{ marginBottom: '20px' }}>
                                    {error}
                                </div>
                            )}
                            
                            <FaceScanner 
                                onCapture={handleCapturarRostro}
                                titulo="Captura tu nuevo rostro"
                                nombreUsuario={nombreUsuario}
                                activo={!exito && !procesando}
                            />
                        </div>
                    ) : paso === 2 ? (
                        <div style={{ padding: '20px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
                                <h3 style={{ marginBottom: '10px', color: '#0d7377' }}>Verificación de Seguridad</h3>
                                <p style={{ color: '#666', marginBottom: '20px' }}>
                                    Por seguridad, ingresa tu código de autenticación de dos factores para confirmar la actualización
                                </p>
                            </div>

                            {error && (
                                <div className="error-message" style={{ marginBottom: '20px' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleActualizarConCodigo2FA}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                        Código 2FA (6 dígitos)
                                    </label>
                                    <input
                                        type="text"
                                        value={codigo2FA}
                                        onChange={(e) => {
                                            const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setCodigo2FA(valor);
                                        }}
                                        placeholder="Ej: 123456"
                                        maxLength="6"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            fontSize: '18px',
                                            textAlign: 'center',
                                            letterSpacing: '8px',
                                            border: '2px solid #ddd',
                                            borderRadius: '8px',
                                            marginBottom: '20px'
                                        }}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setPaso(1);
                                            setCodigo2FA('');
                                            setError('');
                                        }}
                                        className="auth-button-secondary"
                                        style={{ 
                                            flex: '1',
                                            backgroundColor: '#666',
                                            border: '1px solid #888'
                                        }}
                                        disabled={procesando}
                                    >
                                        Volver
                                    </button>
                                    <button 
                                        type="submit"
                                        className="auth-button"
                                        style={{ flex: '1' }}
                                        disabled={procesando || codigo2FA.length !== 6}
                                    >
                                        {procesando ? 'Actualizando...' : 'Confirmar Actualización'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ActualizarRostro;