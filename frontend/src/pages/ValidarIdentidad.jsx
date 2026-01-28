import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import FaceScanner from '../components/FaceScanner.jsx';
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
            // Simular validación facial
            // En una aplicación real, aquí se compararía con face-api.js
            const datosTemporales = JSON.parse(localStorage.getItem('usuarioTemporal'));
            
            // Esperar un poco para simular validación
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Si llegamos aquí, la validación fue exitosa
            setEstado('exito');
            setMensaje('Identidad verificada correctamente');

            // Guardar sesión
            login(datosTemporales.usuario, datosTemporales.token);
            localStorage.removeItem('usuarioTemporal');

            setTimeout(() => {
                if (datosTemporales.usuario.rol === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }, 1500);

        } catch (error) {
            setEstado('error');
            setMensaje('No pudimos verificar tu identidad. Intenta nuevamente.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Reconocimiento Facial</h1>
                <h2>Validar Identidad</h2>

                {estado === 'escaneando' ? (
                    <FaceScanner 
                        onCapture={handleCapturarRostro} 
                        titulo="Verifica tu Identidad"
                        nombreUsuario={datosUsuario?.usuario?.nombre}
                    />
                ) : estado === 'validando' ? (
                    <div className="validation-message">
                        <p>{mensaje}</p>
                        <div className="spinner"></div>
                    </div>
                ) : estado === 'exito' ? (
                    <div className="success-message">
                        <p>✓ ¡Bienvenido {datosUsuario?.usuario?.nombre}! {mensaje}</p>
                    </div>
                ) : (
                    <div className="error-message-large">
                        <p>✗ {mensaje}</p>
                        <button onClick={() => window.location.reload()}>Intentar de Nuevo</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ValidarIdentidad;
