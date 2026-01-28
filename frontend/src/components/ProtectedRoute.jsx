import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { usuario, token, cargando } = useAuth();

    if (cargando) {
        return <div className="loading">Cargando...</div>;
    }

    if (!token || !usuario) {
        return <Navigate to="/login" />;
    }

    if (requireAdmin && usuario.rol !== 'admin') {
        return <Navigate to="/dashboard" />;
    }

    return children;
};
