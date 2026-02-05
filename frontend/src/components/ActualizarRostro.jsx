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

            console.log('[UPDATE-ROSTRO] Actualizando rostro...');
            await authService.actualizarRostro(usuarioId, blob, Array.from(descriptor));

            console.log('[UPDATE-ROSTRO] Rostro actualizado exitosamente');
            setExito(true);

            setTimeout(() => {
                setExito(false);
                onActualizacionExitosa && onActualizacionExitosa();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error:', error);
            setError(error.response?.data?.error || error.message || 'Error al actualizar rostro');
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
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActualizarRostro;