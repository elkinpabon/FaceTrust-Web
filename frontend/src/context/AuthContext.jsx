import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [token, setToken] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        // Recuperar datos del almacenamiento local
        const tokenGuardado = localStorage.getItem('token');
        const usuarioGuardado = localStorage.getItem('usuario');

        if (tokenGuardado && usuarioGuardado) {
            setToken(tokenGuardado);
            setUsuario(JSON.parse(usuarioGuardado));
        }
        setCargando(false);
    }, []);

    const login = (usuarioData, tokenData) => {
        setUsuario(usuarioData);
        setToken(tokenData);
        localStorage.setItem('token', tokenData);
        localStorage.setItem('usuario', JSON.stringify(usuarioData));
    };

    const logout = () => {
        // Detener todos los tracks de cámara/micrófono
        if (navigator.mediaDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                devices.forEach(device => {
                    if (device.kind === 'videoinput' || device.kind === 'audioinput') {
                        console.log('[LOGOUT] Limpiando dispositivo:', device.kind);
                    }
                });
            });
        }
        
        // Buscar y detener todos los streams activos
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => {
                    track.stop();
                    console.log('[LOGOUT] Track detenido:', track.kind);
                });
                video.srcObject = null;
            }
        });

        setUsuario(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        console.log('[LOGOUT] Sesión cerrada, cámara detenida');
    };

    return (
        <AuthContext.Provider value={{ usuario, token, cargando, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};
