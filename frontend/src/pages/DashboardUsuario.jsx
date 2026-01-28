import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuarioService, registroService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/dashboard.css';

const DashboardUsuario = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [registroActual, setRegistroActual] = useState(null);
    const [tab, setTab] = useState('resumen');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const perfilData = await usuarioService.obtenerPerfil();
            setPerfil(perfilData.data);

            const registrosData = await registroService.obtenerMisRegistros();
            setRegistros(registrosData.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleEntrada = async () => {
        try {
            await registroService.registrarEntrada();
            alert('Entrada registrada exitosamente');
            cargarDatos();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al registrar entrada');
        }
    };

    const handleSalida = async () => {
        try {
            await registroService.registrarSalida();
            alert('Salida registrada exitosamente');
            cargarDatos();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al registrar salida');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (cargando) {
        return <div className="loading">Cargando...</div>;
    }

    return (
        <div className="dashboard">
            <nav className="navbar">
                <h1>Dashboard Empleado</h1>
                <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
            </nav>

            <div className="dashboard-container">
                <div className="welcome-section">
                    <h2>¡Bienvenido, {perfil?.nombre}!</h2>
                    <p className="welcome-subtitle">Panel de control personal</p>
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${tab === 'resumen' ? 'active' : ''}`}
                        onClick={() => setTab('resumen')}
                    >
                        Resumen
                    </button>
                    <button
                        className={`tab ${tab === 'perfil' ? 'active' : ''}`}
                        onClick={() => setTab('perfil')}
                    >
                        Mi Perfil
                    </button>
                    <button
                        className={`tab ${tab === 'registros' ? 'active' : ''}`}
                        onClick={() => setTab('registros')}
                    >
                        Mis Registros
                    </button>
                </div>

                {tab === 'resumen' && (
                    <div className="tab-content">
                        <div className="action-buttons">
                            <button onClick={handleEntrada} className="btn-entrada">
                                📍 Registrar Entrada
                            </button>
                            <button onClick={handleSalida} className="btn-salida">
                                🚪 Registrar Salida
                            </button>
                        </div>

                        <div className="info-cards">
                            <div className="card">
                                <h3>Información Personal</h3>
                                <p><strong>Nombre:</strong> {perfil?.nombre} {perfil?.apellido}</p>
                                <p><strong>Correo:</strong> {perfil?.correo}</p>
                                <p><strong>Cédula:</strong> {perfil?.cedula}</p>
                                <p><strong>Teléfono:</strong> {perfil?.telefono || 'N/A'}</p>
                            </div>

                            <div className="card">
                                <h3>Registro de Hoy</h3>
                                {registros.length > 0 ? (
                                    <div>
                                        <p><strong>Entrada:</strong> {new Date(registros[0].hora_entrada).toLocaleTimeString()}</p>
                                        <p><strong>Salida:</strong> {registros[0].hora_salida ? new Date(registros[0].hora_salida).toLocaleTimeString() : 'Pendiente'}</p>
                                    </div>
                                ) : (
                                    <p>Sin registros aún</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'perfil' && (
                    <div className="tab-content">
                        <div className="profile-section">
                            <h3>Mi Perfil</h3>
                            <div className="profile-details">
                                <div className="detail-item">
                                    <label>Nombre Completo:</label>
                                    <p>{perfil?.nombre} {perfil?.apellido}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Correo Electrónico:</label>
                                    <p>{perfil?.correo}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Cédula:</label>
                                    <p>{perfil?.cedula}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Teléfono:</label>
                                    <p>{perfil?.telefono || 'No registrado'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Dirección:</label>
                                    <p>{perfil?.direccion || 'No registrada'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Fecha de Registro:</label>
                                    <p>{new Date(perfil?.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'registros' && (
                    <div className="tab-content">
                        <div className="registros-section">
                            <h3>Mis Registros de Asistencia</h3>
                            <table className="registros-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Entrada</th>
                                        <th>Salida</th>
                                        <th>Duración</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.length > 0 ? (
                                        registros.map((registro) => (
                                            <tr key={registro.id}>
                                                <td>{new Date(registro.hora_entrada).toLocaleDateString()}</td>
                                                <td>{new Date(registro.hora_entrada).toLocaleTimeString()}</td>
                                                <td>{registro.hora_salida ? new Date(registro.hora_salida).toLocaleTimeString() : '-'}</td>
                                                <td>{registro.duracion || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4">No hay registros</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardUsuario;
