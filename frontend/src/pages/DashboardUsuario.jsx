import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuarioService, registroService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Clock, Play, Square, LogOut, User, FileText, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import '../styles/dashboard.css';

const DashboardUsuario = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [perfil, setPerfil] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('resumen');
    const [registroExitoso, setRegistroExitoso] = useState(null);

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
            setRegistroExitoso('entrada');
            setTimeout(() => setRegistroExitoso(null), 3000);
            cargarDatos();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al registrar entrada');
        }
    };

    const handleSalida = async () => {
        try {
            await registroService.registrarSalida();
            setRegistroExitoso('salida');
            setTimeout(() => setRegistroExitoso(null), 3000);
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
        return <div className="user-loading">
            <div className="loading-spinner"></div>
            <p>Cargando tu perfil...</p>
        </div>;
    }

    const registroHoy = registros.length > 0 ? registros[0] : null;

    return (
        <div className="dashboard">
            {registroExitoso && (
                <div className="success-notification">
                    <div className="notification-content">
                        <div className="notification-icon">
                            <CheckCircle size={24} color="white" />
                        </div>
                        <div className="notification-text">
                            <p className="notification-title">
                                {registroExitoso === 'entrada' ? '¡Entrada registrada!' : '¡Salida registrada!'}
                            </p>
                            <p className="notification-time">
                                {new Date().toLocaleTimeString('es-CO')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <nav className="dashboard-navbar">
                <div className="navbar-logo-section">
                    <Logo size={32} />
                    <h1>FACETRUST</h1>
                </div>
                <div className="navbar-right">
                    <span className="user-info">{perfil?.nombre} {perfil?.apellido}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} style={{marginRight: '6px'}} />
                        Cerrar Sesión
                    </button>
                </div>
            </nav>

            <div className="dashboard-container">
                <div className="welcome-section">
                    <h2>¡Bienvenido, {perfil?.nombre}!</h2>
                    <p className="welcome-subtitle">Controla tu asistencia desde aquí</p>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-button ${tab === 'resumen' ? 'active' : ''}`}
                        onClick={() => setTab('resumen')}
                    >
                        <Clock size={18} style={{marginRight: '8px'}} />
                        Resumen
                    </button>
                    <button
                        className={`tab-button ${tab === 'perfil' ? 'active' : ''}`}
                        onClick={() => setTab('perfil')}
                    >
                        <User size={18} style={{marginRight: '8px'}} />
                        Mi Perfil
                    </button>
                    <button
                        className={`tab-button ${tab === 'registros' ? 'active' : ''}`}
                        onClick={() => setTab('registros')}
                    >
                        <FileText size={18} style={{marginRight: '8px'}} />
                        Mis Registros
                    </button>
                </div>

                {tab === 'resumen' && (
                    <div className="tab-content">
                        <div className="action-buttons">
                            <button onClick={handleEntrada} className="btn-action btn-entrada">
                                <Play size={20} style={{marginRight: '8px'}} />
                                Registrar Entrada
                            </button>
                            <button onClick={handleSalida} className="btn-action btn-salida">
                                <Square size={20} style={{marginRight: '8px'}} />
                                Registrar Salida
                            </button>
                        </div>

                        <div className="info-cards">
                            <div className="info-card">
                                <div className="card-header">
                                    <h3>Información Personal</h3>
                                    <span className="card-icon"><User size={22} color="#0d7377" /></span>
                                </div>
                                <div className="card-body">
                                    <div className="info-item">
                                        <label>Nombre Completo</label>
                                        <p>{perfil?.nombre} {perfil?.apellido}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Correo Electrónico</label>
                                        <p>{perfil?.correo}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Cédula</label>
                                        <p>{perfil?.cedula}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Teléfono</label>
                                        <p>{perfil?.telefono || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="info-card">
                                <div className="card-header">
                                    <h3>Registro de Hoy</h3>
                                    <span className="card-icon">📅</span>
                                </div>
                                <div className="card-body">
                                    {registroHoy ? (
                                        <>
                                            <div className="info-item">
                                                <label>Entrada</label>
                                                <p className="highlight-entrada">{new Date(registroHoy.hora_entrada).toLocaleTimeString('es-CO')}</p>
                                            </div>
                                            <div className="info-item">
                                                <label>Salida</label>
                                                <p className={registroHoy.hora_salida ? 'highlight-salida' : 'pending'}>
                                                    {registroHoy.hora_salida ? new Date(registroHoy.hora_salida).toLocaleTimeString('es-CO') : 'Pendiente'}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="no-records">Sin registros aún</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'perfil' && (
                    <div className="tab-content">
                        <div className="profile-card">
                            <div className="profile-header">
                                <h3>Perfil Completo</h3>
                            </div>
                            <div className="profile-details">
                                <div className="profile-group">
                                    <div className="detail-item">
                                        <label>Nombre Completo</label>
                                        <p>{perfil?.nombre} {perfil?.apellido}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Correo Electrónico</label>
                                        <p>{perfil?.correo}</p>
                                    </div>
                                </div>

                                <div className="profile-group">
                                    <div className="detail-item">
                                        <label>Cédula</label>
                                        <p>{perfil?.cedula}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Teléfono</label>
                                        <p>{perfil?.telefono || '-'}</p>
                                    </div>
                                </div>

                                <div className="profile-group">
                                    <div className="detail-item">
                                        <label>Dirección</label>
                                        <p>{perfil?.direccion || '-'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Fecha de Registro</label>
                                        <p>{new Date(perfil?.created_at).toLocaleDateString('es-CO')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'registros' && (
                    <div className="tab-content">
                        <div className="registros-card">
                            <div className="registros-header">
                                <h3>Mis Registros de Asistencia</h3>
                                <span className="total-records">{registros.length} registros</span>
                            </div>
                            <div className="table-wrapper">
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
                                                    <td><strong>{new Date(registro.hora_entrada).toLocaleDateString('es-CO')}</strong></td>
                                                    <td>{new Date(registro.hora_entrada).toLocaleTimeString('es-CO')}</td>
                                                    <td>{registro.hora_salida ? new Date(registro.hora_salida).toLocaleTimeString('es-CO') : '-'}</td>
                                                    <td>{registro.duracion || '-'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="4" className="empty-message">Sin registros de asistencia</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardUsuario;
