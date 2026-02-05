import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
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
    const [intentosFallidos, setIntentosFallidos] = useState(0); // Contador de intentos fallidos

    const cerrarModal = () => {
        setError('');
        setExito(false);
        setProcesando(false);
        setPaso(1);
        setCodigo2FA('');
        setBlobTemporal(null);
        setDescriptorTemporal(null);
        // NO resetear intentosFallidos si llegó a 3
        if (intentosFallidos < 3) {
            setIntentosFallidos(0);
        }
        onClose();
    };

    // Verificar si está bloqueado por intentos al abrir
    useEffect(() => {
        if (isOpen && intentosFallidos >= 3) {
            setError('Límite de intentos excedido. El modal se cerrará automáticamente.');
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [isOpen, intentosFallidos, onClose]);

    // Calcular distancia euclidiana entre dos descriptores
    const calcularDistancia = (descriptor1, descriptor2) => {
        if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
            return Infinity;
        }
        
        let suma = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diferencia = descriptor1[i] - descriptor2[i];
            suma += diferencia * diferencia;
        }
        
        return Math.sqrt(suma);
    };

    // Validar similitud entre nuevo rostro y rostro actual
    const validarSimilitudRostro = async (nuevoDescriptor) => {
        try {
            console.log('[UPDATE-ROSTRO] Validando similitud del rostro con el registrado...');
            
            // Obtener el descriptor actual del usuario depuis localStorage o hacer petición
            const descriptorGuardado = localStorage.getItem(`descriptor_${usuarioId}`);
            
            if (!descriptorGuardado) {
                console.log('[UPDATE-ROSTRO] ⚠️ No se encontró descriptor anterior en localStorage, obteniendo del servidor...');
                // Hacer petición al servidor para obtener el descriptor
                const response = await authService.obtenerDescriptorActual(usuarioId);
                const descriptorActual = response.data?.descriptor || JSON.parse(response.data?.descriptor_json);
                
                if (!descriptorActual) {
                    throw new Error('No se pudo obtener tu descriptor facial actual');
                }
                
                return validarSimilitudLocal(nuevoDescriptor, descriptorActual);
            }
            
            const descriptorActual = JSON.parse(descriptorGuardado);
            return validarSimilitudLocal(nuevoDescriptor, descriptorActual);
        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error validando similitud:', error);
            throw new Error('Error al validar similitud del rostro: ' + error.message);
        }
    };

    const validarSimilitudLocal = (descriptorNuevo, descriptorActual) => {
        const distancia = calcularDistancia(descriptorNuevo, descriptorActual);
        const umbral = 0.45; // Mismo umbral que el backend
        
        console.log(`[UPDATE-ROSTRO] Distancia calculada: ${distancia.toFixed(4)}`);
        console.log(`[UPDATE-ROSTRO] Umbral requerido: ${umbral}`);
        
        const esMismaPersona = distancia < umbral;
        
        if (esMismaPersona) {
            console.log(`[UPDATE-ROSTRO] ✓ VALIDACIÓN EXITOSA: Rostro coincide (distancia: ${distancia.toFixed(4)})`);
            return true;
        } else {
            console.log(`[UPDATE-ROSTRO] ✗ VALIDACIÓN FALLIDA: Rostro NO coincide (distancia: ${distancia.toFixed(4)} >= ${umbral})`);
            return false;
        }
    };

    const handleCapturarRostro = async (blob) => {
        if (procesando) return;

        // Si ya llegó a 3 intentos fallidos, cerrar el modal
        if (intentosFallidos >= 3) {
            setError('Límite de intentos excedido. Por favor, intenta más tarde.');
            setTimeout(() => {
                cerrarModal();
            }, 2000);
            return;
        }

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

            // VALIDACIÓN CRÍTICA: Verificar que el nuevo rostro coincida con el actual
            const esValido = await validarSimilitudRostro(descriptor);
            
            if (!esValido) {
                // Incrementar contador de intentos fallidos
                const nuevoIntento = intentosFallidos + 1;
                setIntentosFallidos(nuevoIntento);
                
                if (nuevoIntento >= 3) {
                    // Cerrar modal después de 3 intentos fallidos
                    setError(`Intento ${nuevoIntento}/3 fallido. Límite excedido. El modal se cerrará automáticamente.`);
                    setTimeout(() => {
                        onClose();
                    }, 3000);
                } else {
                    setError(`Intento ${nuevoIntento}/3: El rostro capturado NO coincide con tu rostro registrado.`);
                }
                
                return; // ✗ No pasar a Paso 2
            }

            // ✓ Validación exitosa: Guardar temporalmente y pasar al paso de 2FA
            console.log('[UPDATE-ROSTRO] ✓ Similitud validada - Passando a Paso 2 (2FA)');
            setBlobTemporal(blob);
            setDescriptorTemporal(descriptor);
            setIntentosFallidos(0); // Resetear contador cuando se captura exitosamente
            setPaso(2);
            console.log('[UPDATE-ROSTRO] Rostro capturado, esperando código 2FA...');

        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error:', error);
            
            // Incrementar contador de intentos fallidos
            const nuevoIntento = intentosFallidos + 1;
            setIntentosFallidos(nuevoIntento);
            
            if (nuevoIntento >= 3) {
                // Cerrar modal después de 3 intentos fallidos
                const mensajeError = error.response?.data?.codigoError === '2FA_NO_ACTIVADO'
                    ? 'Debes activar 2FA antes de actualizar tu rostro.'
                    : error.message || 'Error al capturar rostro';
                
                setError(`Intento ${nuevoIntento}/3 fallido. ${mensajeError}. El modal se cerrará automáticamente.`);
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                if (error.response?.data?.codigoError === '2FA_NO_ACTIVADO') {
                    setError('Debes activar la autenticación de dos factores antes de poder actualizar tu rostro.');
                } else {
                    setError(`Intento ${nuevoIntento}/3: ${error.message || 'Error al capturar rostro'}`);
                }
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

        // SEGURIDAD CRÍTICA: No permitir actualizar sin rostro capturado exitosamente
        if (!blobTemporal || !descriptorTemporal) {
            setError('Por seguridad, debes capturar tu rostro correctamente antes de actualizar.');
            return;
        }

        setProcesando(true);
        setError('');

        try {
            console.log('[UPDATE-ROSTRO] Actualizando rostro con validación 2FA...');
            
            // El backend hará las validaciones finales
            await authService.actualizarRostro(
                usuarioId, 
                blobTemporal, 
                Array.from(descriptorTemporal),
                codigo2FA,
                false // No necesita soloAutenticador porque ya pasó validación de rostro
            );

            console.log('[UPDATE-ROSTRO] Rostro actualizado exitosamente');
            setExito(true);

            setTimeout(() => {
                setExito(false);
                setPaso(1);
                setCodigo2FA('');
                setIntentosFallidos(0);
                onActualizacionExitosa && onActualizacionExitosa();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('[UPDATE-ROSTRO] Error:', error);
            
            // Manejar errores específicos
            if (error.response?.data?.codigoError === 'ROSTRO_NO_COINCIDE') {
                setError('⚠️ Rostro no reconocido: El rostro capturado no coincide con tu identidad registrada.');
            } else if (error.response?.data?.codigoError === 'ROSTRO_DUPLICADO') {
                setError('Este rostro ya está registrado por otro usuario en el sistema.');
            } else if (error.response?.data?.codigoError === 'CODIGO_2FA_INVALIDO') {
                setError('Código 2FA inválido. Verifica el código en tu aplicación Google Authenticator.');
            } else if (error.response?.data?.codigoError === '2FA_NO_ACTIVADO') {
                setError('Debes activar la autenticación de dos factores antes de poder actualizar tu rostro.');
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
                            <div className="success-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                <CheckCircle size={48} color="#22c55e" />
                            </div>
                            <h3 style={{ color: '#22c55e', marginBottom: '10px' }}>Rostro Actualizado</h3>
                            <p>El rostro se ha actualizado correctamente</p>
                        </div>
                    ) : intentosFallidos >= 3 ? (
                        // Después de 3 intentos fallidos, solo mostrar error y cierre automático
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                <AlertTriangle size={48} color="#dc2626" />
                            </div>
                            <h3 style={{ color: '#dc2626', marginBottom: '15px' }}>Límite de Intentos Excedido</h3>
                            {error && (
                                <div style={{ color: '#dc2626', marginBottom: '20px', fontSize: '14px' }}>
                                    {error}
                                </div>
                            )}
                            <p style={{ color: '#666', fontSize: '14px' }}>
                                El modal se cerrará automáticamente en unos momentos...
                            </p>
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
                                activo={!exito && !procesando && intentosFallidos < 3}
                            />
                        </div>
                    ) : paso === 2 ? (
                        <div style={{ padding: '20px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                    <Lock size={48} color="#0d7377" />
                                </div>
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