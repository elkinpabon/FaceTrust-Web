import React, { useState, useRef } from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import { authService } from '../services/api';
import '../styles/modal2fa.css';

export default function Modal2FA({ usuario, onCerrar, onExito }) {
    const [paso, setPaso] = useState(1); // 1: inicio, 2: QR, 3: verificar código
    const [qrCode, setQrCode] = useState(null);
    const [codigo, setCodigo] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [codigoCopiado, setCodigoCopiado] = useState(false);
    const inputRef = useRef(null);

    // Paso 1: Solicitar QR
    const solicitarQR = async () => {
        try {
            setCargando(true);
            setError('');
            
            console.log('[2FA] Solicitando QR para:', usuario.correo);
            
            const respuesta = await authService.solicitarDosFA({ 
                correo: usuario.correo 
            });

            console.log('[2FA] Respuesta completa:', respuesta);
            console.log('[2FA] Respuesta data:', respuesta.data);

            const datos = respuesta.data || respuesta;
            
            if (datos.qrCode) {
                setQrCode(datos.qrCode);
                setPaso(2);
                console.log('[2FA] QR recibido, mostrando en modal');
            } else {
                console.error('[2FA] qrCode no encontrado en respuesta:', datos);
                setError('No se pudo generar el código QR');
            }
        } catch (err) {
            console.error('[2FA ERROR]', err);
            setError(err.response?.data?.error || 'Error al generar QR');
        } finally {
            setCargando(false);
        }
    };

    // Paso 2: Verificar código
    const verificarCodigo = async () => {
        try {
            if (codigo.length !== 6) {
                setError('El código debe tener 6 dígitos');
                return;
            }

            setCargando(true);
            setError('');

            console.log('[2FA] Verificando código...');

            const respuesta = await authService.verificarDosFA({
                usuarioId: usuario.id,
                codigo
            });

            console.log('[2FA] ✓ Código verificado exitosamente');

            // Limpiar y cerrar
            setCodigo('');
            setPaso(1);
            setQrCode(null);
            onCerrar();
            
            if (onExito) {
                onExito(respuesta.data || respuesta);
            }
        } catch (err) {
            console.error('[2FA ERROR]', err);
            setError(err.response?.data?.error || 'Código inválido');
            setCodigo('');
        } finally {
            setCargando(false);
        }
    };

    // Manejar cambio de código
    const manejarCambio = (e) => {
        const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCodigo(valor);
        setError('');

        // Auto-enviar si alcanza 6 dígitos
        if (valor.length === 6) {
            setTimeout(() => {
                console.log('[2FA] 6 dígitos completos, verificando automáticamente');
            }, 100);
        }
    };

    // Copiar código manualmente
    const copiarCodigo = () => {
        inputRef.current?.select();
        document.execCommand('copy');
        setCodigoCopiado(true);
        setTimeout(() => setCodigoCopiado(false), 2000);
    };

    return (
        <div className="modal-2fa-overlay" onClick={onCerrar}>
            <div className="modal-2fa-contenedor" onClick={(e) => e.stopPropagation()}>
                {/* PASO 1: Inicio */}
                {paso === 1 && (
                    <div className="paso-2fa paso-1">
                        <ShieldAlert size={40} className="icono-shield" />
                        <h2>Activar Autenticación de Dos Factores</h2>
                        <p>Protege tu cuenta con Google Authenticator. Cada vez que inices sesión, necesitarás un código de 6 dígitos.</p>
                        
                        <div className="pasos-info">
                            <div className="paso-item">
                                <div className="numero">1</div>
                                <p>Escanea el código QR con Google Authenticator</p>
                            </div>
                            <div className="paso-item">
                                <div className="numero">2</div>
                                <p>Verifica el código de 6 dígitos</p>
                            </div>
                            <div className="paso-item">
                                <div className="numero">3</div>
                                <p>Tu cuenta estará protegida</p>
                            </div>
                        </div>

                        {error && <div className="error-mensaje">{error}</div>}

                        <div className="botones-modal-2fa">
                            <button 
                                className="btn-cancelar" 
                                onClick={onCerrar}
                                disabled={cargando}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn-continuar" 
                                onClick={solicitarQR}
                                disabled={cargando}
                            >
                                {cargando ? 'Generando...' : 'Continuar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2: Mostrar QR */}
                {paso === 2 && (
                    <div className="paso-2fa paso-2">
                        <h2>Escanea el Código QR</h2>
                        <p>Abre Google Authenticator en tu móvil y escanea este código</p>
                        
                        {qrCode && (
                            <div className="qr-contenedor">
                                <img src={qrCode} alt="Código QR 2FA" className="qr-imagen" />
                            </div>
                        )}

                        <div className="instrucciones">
                            <p><strong>¿No puedes escanear?</strong></p>
                            <p>Abre Google Authenticator y selecciona "Configuración manual". Luego ingresa el código cuando se te pida.</p>
                        </div>

                        {error && <div className="error-mensaje">{error}</div>}

                        <div className="botones-modal-2fa">
                            <button 
                                className="btn-atras"
                                onClick={() => setPaso(1)}
                                disabled={cargando}
                            >
                                Atrás
                            </button>
                            <button 
                                className="btn-siguiente"
                                onClick={() => setPaso(3)}
                            >
                                Ya escaneé el código
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 3: Verificar Código */}
                {paso === 3 && (
                    <div className="paso-2fa paso-3">
                        <h2>Ingresa el Código</h2>
                        <p>Introduce el código de 6 dígitos que ves en Google Authenticator</p>

                        <div className="codigo-input-contenedor">
                            <input
                                ref={inputRef}
                                type="text"
                                value={codigo}
                                onChange={manejarCambio}
                                placeholder="000000"
                                maxLength="6"
                                className="codigo-input"
                                autoComplete="off"
                                disabled={cargando}
                            />
                            <button 
                                className="btn-copiar"
                                onClick={copiarCodigo}
                                title="Copiar campo"
                            >
                                {codigoCopiado ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div className="contador-codigo">
                            {codigo.length}/6 dígitos
                        </div>

                        {error && <div className="error-mensaje">{error}</div>}

                        <div className="botones-modal-2fa">
                            <button 
                                className="btn-atras"
                                onClick={() => setPaso(2)}
                                disabled={cargando}
                            >
                                Atrás
                            </button>
                            <button 
                                className="btn-verificar"
                                onClick={verificarCodigo}
                                disabled={codigo.length !== 6 || cargando}
                            >
                                {cargando ? 'Verificando...' : 'Verificar Código'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
