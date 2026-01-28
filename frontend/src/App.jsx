import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

// Páginas
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import ValidarIdentidad from './pages/ValidarIdentidad.jsx';
import DashboardUsuario from './pages/DashboardUsuario.jsx';
import DashboardAdmin from './pages/DashboardAdmin.jsx';

import './App.css';

const AppContent = () => {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return <div className="loading-app">Cargando aplicación...</div>;
    }

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/validar-identidad" element={<ValidarIdentidad />} />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardUsuario />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute requireAdmin={true}>
                        <DashboardAdmin />
                    </ProtectedRoute>
                }
            />

            <Route path="/" element={<Navigate to={usuario ? (usuario.rol === 'admin' ? '/admin' : '/dashboard') : '/login'} />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

export default App;
