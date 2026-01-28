import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import '../styles/faceScanner.css';

const FaceScanner = ({ onCapture, titulo = "Escanear Rostro", autoCapture = true, nombreUsuario = null }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [rostroDetectado, setRostroDetectado] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');

    // Cargar modelos de face-api
    useEffect(() => {
        const cargarModelos = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setModelsLoaded(true);
                setCargando(false);
                setMensaje('✓ Modelos cargados. Acerca tu rostro...');
            } catch (error) {
                console.error('Error cargando modelos:', error);
                setCargando(false);
                setMensaje('❌ Error cargando modelos');
            }
        };

        cargarModelos();
    }, []);

    const iniciarCamara = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    detectarRostro();
                };
            }
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            setMensaje('❌ Error accediendo a la cámara');
        }
    };

    // Iniciar cámara
    useEffect(() => {
        if (!modelsLoaded) return;

        iniciarCamara();

        return () => {
            const video = videoRef.current;
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [modelsLoaded, iniciarCamara]);

    const detectarRostro = async () => {
        if (!videoRef.current || !modelsLoaded) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        let isDetecting = false;
        let lastCaptureTime = 0;

        const detectRostroInterval = setInterval(async () => {
            if (!video.srcObject || isDetecting) return;

            isDetecting = true;

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
                        setRostroDetectado(true);
                        setMensaje('✓ Rostro detectado. Capturando...');
                        
                        // Dibujar detecciones
                        faceapi.draw.drawDetections(canvas, detections);
                        faceapi.draw.drawFaceLandmarks(canvas, detections);

                        // Captura automática si está habilitada y no se capturó recientemente
                        const ahora = Date.now();
                        if (autoCapture && (ahora - lastCaptureTime) > 1500) {
                            lastCaptureTime = ahora;
                            capturarRostroAutomatico();
                        }
                    } else {
                        setRostroDetectado(false);
                        setMensaje('👤 Acerca tu rostro a la cámara');
                    }
                }
            } catch (error) {
                console.error('Error detectando rostro:', error);
            } finally {
                isDetecting = false;
            }
        }, 300);

        return () => clearInterval(detectRostroInterval);
    };

    const capturarRostroAutomatico = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            setMensaje('✅ Rostro capturado correctamente');
            onCapture(blob);
        }, 'image/jpeg', 0.95);
    };

    const capturarRostroManual = () => {
        if (!rostroDetectado) {
            setMensaje('⚠️ Por favor, acerca tu rostro primero');
            return;
        }
        capturarRostroAutomatico();
    };

    if (cargando) {
        return (
            <div className="face-scanner">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-message">Cargando modelos de reconocimiento facial...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="face-scanner">
            <div className="scanner-header">
                <h3 className="scanner-title">{titulo}</h3>
                {nombreUsuario && <p className="usuario-nombre">👤 {nombreUsuario}</p>}
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
                    {rostroDetectado ? '✓ Rostro detectado' : '👤 Posiciona tu rostro aquí'}
                </div>
                {rostroDetectado && (
                    <div className="detected-badge">
                        <span className="badge-dot"></span>
                        Listo para capturar
                    </div>
                )}
            </div>

            <div className={`detection-message ${rostroDetectado ? 'success' : 'info'}`}>
                {rostroDetectado ? '✓ Captura en progreso...' : mensaje}
            </div>

            {!autoCapture && (
                <button
                    onClick={capturarRostroManual}
                    disabled={!rostroDetectado}
                    className="capture-button"
                >
                    📸 Capturar Rostro
                </button>
            )}
        </div>
    );
};

export default FaceScanner;
