import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import '../styles/faceScanner.css';

const FaceScanner = ({ onCapture, titulo = "Escanear Rostro", autoCapture = true, nombreUsuario = null, activo = true }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectIntervalRef = useRef(null);
    const streamRef = useRef(null);
    const lastCaptureTimeRef = useRef(0);
    const isDetectingRef = useRef(false);
    
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

                if (canvas) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (detections.length > 0) {
                        console.log('[DETECT] Rostro detectado:', detections.length);
                        setRostroDetectado(true);
                        
                        // Dibujar detecciones
                        faceapi.draw.drawDetections(canvas, detections);
                        faceapi.draw.drawFaceLandmarks(canvas, detections);

                        // Captura automática si está habilitada y no se capturó recientemente
                        const ahora = Date.now();
                        if (autoCapture && (ahora - lastCaptureTimeRef.current) > 1500) {
                            console.log('[CAPTURE] Capturando automáticamente...');
                            lastCaptureTimeRef.current = ahora;
                            capturarRostroAutomatico();
                        }
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
        if (!videoRef.current) {
            console.error('[CAPTURE] videoRef no disponible');
            return;
        }

        console.log('[CAPTURE] Capturando rostro...');

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            if (canvas.width === 0 || canvas.height === 0) {
                console.error('[CAPTURE] Dimensiones del video inválidas');
                return;
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                console.log('[CAPTURE] Blob creado:', blob ? blob.size + ' bytes' : 'NULL');
                if (blob) {
                    onCapture(blob);
                } else {
                    console.error('[CAPTURE] Error: blob es NULL');
                }
            }, 'image/jpeg', 0.95);
        } catch (error) {
            console.error('[CAPTURE] Error en captura:', error);
        }
    }, [onCapture]);

    const iniciarCamara = useCallback(async () => {
        try {
            console.log('[CAMERA] Iniciando cámara...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            console.log('[CAMERA] Stream obtenido:', stream.getTracks().length, 'tracks');
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
            console.log('[SETUP] Esperando a que se carguen los modelos...');
            return;
        }

        console.log('[SETUP] Models cargados, activo:', activo);

        if (activo) {
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
                    {rostroDetectado ? 'Rostro detectado' : 'Posiciona tu rostro aquí'}
                </div>
                {rostroDetectado && (
                    <div className="detected-badge">
                        <span className="badge-dot"></span>
                        Listo para capturar
                    </div>
                )}
            </div>

            <div className="detection-message-wrapper">
                <div className={`detection-message ${rostroDetectado ? 'success' : 'info'}`}>
                    {rostroDetectado ? '✓ Rostro detectado correctamente - Capturando...' : 'Acerca tu rostro a la cámara'}
                </div>
            </div>

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
