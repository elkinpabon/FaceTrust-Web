import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import '../styles/faceScanner.css';

const FaceScanner = ({ onCapture, titulo = "Escanear Rostro", autoCapture = true, nombreUsuario = null, activo = true }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectIntervalRef = useRef(null);
    const streamRef = useRef(null);
    const isDetectingRef = useRef(false);
    const capturedRef = useRef(false);
    
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [rostroDetectado, setRostroDetectado] = useState(false);
    const [cargando, setCargando] = useState(true);

    // Cargar modelos de face-api
    useEffect(() => {
        const cargarModelos = async () => {
            try {
                console.log('[FACE-API] Cargando modelos...');
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                console.log('[FACE-API] Modelos cargados correctamente');
                setModelsLoaded(true);
                setCargando(false);
            } catch (error) {
                console.error('[FACE-API] Error cargando modelos:', error);
                setCargando(false);
            }
        };

        cargarModelos();
    }, []);

    const detenerCamara = useCallback(() => {
        console.log('[CAMERA] Deteniendo cámara...');
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
            detectIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('[CAMERA] Track detenido:', track.kind);
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setRostroDetectado(false);
        console.log('[CAMERA] Cámara detenida completamente');
    }, []);

    const detectarRostro = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
            console.log('[DETECT] No puede iniciar - video:', !!videoRef.current, 'canvas:', !!canvasRef.current, 'modelsLoaded:', modelsLoaded);
            return;
        }

        console.log('[DETECT] Iniciando detección de rostro...');
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Limpiar intervalo anterior si existe
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
        }

        detectIntervalRef.current = setInterval(async () => {
            if (!video.srcObject || isDetectingRef.current) return;

            isDetectingRef.current = true;

            try {
                const detections = await faceapi
                    .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (canvas && video.videoWidth && video.videoHeight) {
                    // Dimensiones del contenedor CSS
                    const containerWidth = 560;
                    const containerHeight = 640;
                    
                    canvas.width = containerWidth;
                    canvas.height = containerHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Escala para ajustar los dibujos al contenedor
                    const scaleX = containerWidth / video.videoWidth;
                    const scaleY = containerHeight / video.videoHeight;
                    
                    if (detections.length > 0) {
                        setRostroDetectado(true);
                        
                        // Aplicar transformación espejo y retomar escala
                        ctx.save();
                        ctx.translate(canvas.width / 2, 0);
                        ctx.scale(-scaleX, scaleY);
                        ctx.translate(-video.videoWidth / 2, 0);
                        
                        faceapi.draw.drawDetections(ctx.canvas, detections);
                        faceapi.draw.drawFaceLandmarks(ctx.canvas, detections);
                        
                        ctx.restore();
                    } else {
                        setRostroDetectado(false);
                    }
                }
            } catch (error) {
                console.error('[DETECT] Error detectando:', error);
            } finally {
                isDetectingRef.current = false;
            }
        }, 300);
    }, [modelsLoaded, autoCapture]);

    const capturarRostroAutomatico = useCallback(() => {
        if (capturedRef.current) {
            console.log('[CAPTURE] Ya se capturó una imagen, ignorando nuevas capturas');
            return;
        }

        if (!videoRef.current) {
            console.error('[CAMERA] Video no disponible');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            if (canvas.width === 0 || canvas.height === 0) {
                console.error('[CAMERA] Dimensiones inválidas');
                return;
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    if (blob && typeof onCapture === 'function') {
                        capturedRef.current = true;
                        onCapture(blob);
                    }
                })
                .catch(err => {
                    console.error('[CAPTURE] Error:', err.message);
                });
        } catch (error) {
            console.error('[CAPTURE] Error:', error.message);
        }
    }, [onCapture]);

    const iniciarCamara = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    console.log('[CAMERA] Video metadata cargado, iniciando detección');
                    console.log('[CAMERA] Dimensiones:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                    detectarRostro();
                };
                videoRef.current.onerror = (e) => {
                    console.error('[CAMERA] Error en video:', e);
                };
            }
        } catch (error) {
            console.error('[CAMERA] Error iniciando:', error);
        }
    }, [detectarRostro]);

    // Iniciar/detener cámara
    useEffect(() => {
        if (!modelsLoaded) {
            return;
        }

        if (activo) {
            capturedRef.current = false;
            iniciarCamara();
        } else {
            detenerCamara();
        }

        return () => {
            detenerCamara();
        };
    }, [modelsLoaded, activo, iniciarCamara, detenerCamara]);

    const capturarRostroManual = useCallback(() => {
        if (!rostroDetectado) {
            console.log('[CAPTURE] Rostro no detectado aún');
            return;
        }
        capturarRostroAutomatico();
    }, [rostroDetectado, capturarRostroAutomatico]);

    if (cargando) {
        return (
            <div className="face-scanner">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-title">Iniciando análisis facial...</p>
                    <p className="loading-subtitle">Por favor espera mientras se cargan los modelos de reconocimiento facial avanzado</p>
                </div>
            </div>
        );
    }

    return (
        <div className="face-scanner">
            <div className="scanner-header">
                <h3 className="scanner-title">{titulo}</h3>
                {nombreUsuario && <p className="usuario-nombre">{nombreUsuario}</p>}
            </div>
            
            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="video-stream"
                />
                <canvas 
                    ref={canvasRef} 
                    className="detection-canvas"
                />
                {rostroDetectado && (
                    <div className="face-detection-indicator">
                        <div className="detection-ring"></div>
                    </div>
                )}
                <div className="overlay-instructions">
                    Posiciona tu rostro aquí
                </div>
            </div>

            {rostroDetectado && (
                <button
                    onClick={capturarRostroAutomatico}
                    className="capture-button-manual"
                >
                    Capturar Ahora
                </button>
            )}

            {!autoCapture && (
                <button
                    onClick={capturarRostroManual}
                    disabled={!rostroDetectado}
                    className="capture-button"
                >
                    Capturar Rostro
                </button>
            )}
        </div>
    );
};

export default FaceScanner;
