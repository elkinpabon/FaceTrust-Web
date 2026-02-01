import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, CheckCircle, LogOut, Search, Trash2 } from 'lucide-react';
import { usuarioService, registroService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/admin.css';

const DashboardAdmin = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('dashboard');
    const [filtro, setFiltro] = useState('');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const usuariosData = await usuarioService.obtenerTodos('');
            setUsuarios(usuariosData.data);

            const registrosData = await registroService.obtenerTodos();
            setRegistros(registrosData.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleBuscar = async () => {
        try {
            const usuariosData = await usuarioService.obtenerTodos(filtro);
            setUsuarios(usuariosData.data);
        } catch (error) {
            console.error('Error en búsqueda:', error);
        }
    };

    const handleEliminar = async (usuarioId) => {
        if (window.confirm('¿Confirmas que deseas eliminar este usuario?')) {
            try {
                await usuarioService.eliminar(usuarioId);
                cargarDatos();
                alert('Usuario eliminado correctamente');
            } catch (error) {
                alert('Error al eliminar usuario');
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (cargando) {
        return <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>Cargando datos administrativos...</p>
        </div>;
    }

    const totalUsuarios = usuarios.length;
    const totalRegistros = registros.length;
    const usuariosActivosHoy = new Set(registros.map(r => r.usuario_id)).size;

    return (
        <div className="admin-dashboard">
            <nav className="admin-navbar">
                <div className="navbar-logo-section">
                    <Logo size={32} />
                    <h1>FACETRUST Admin</h1>
                </div>
                <div className="navbar-right">
                    <span className="admin-name">Admin: {usuario?.nombre}</span>
                    <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
                </div>
            </nav>

            <div className="admin-container">
                <div className="welcome-section">
                    <h2>Panel Administrativo</h2>
                    <p className="welcome-subtitle">Gestión integral de usuarios y registros de asistencia</p>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-button ${tab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        className={`tab-button ${tab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => setTab('usuarios')}
                    >
                        <Users size={18} style={{marginRight: '8px'}} />
                        Usuarios
                    </button>
                    <button
                        className={`tab-button ${tab === 'registros' ? 'active' : ''}`}
                        onClick={() => setTab('registros')}
                    >
                        <ClipboardList size={18} style={{marginRight: '8px'}} />
                        Asistencia
                    </button>
                </div>

                {tab === 'dashboard' && (
                    <div className="tab-content">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <Users size={32} color="white" />
                                </div>
                                <div className="stat-info">
                                    <h3>Total Usuarios</h3>
                                    <p className="stat-number">{totalUsuarios}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <ClipboardList size={32} color="white" />
                                </div>
                                <div className="stat-info">
                                    <h3>Total Registros</h3>
                                    <p className="stat-number">{totalRegistros}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <CheckCircle size={32} color="white" />
                                </div>
                                <div className="stat-info">
                                    <h3>Activos Hoy</h3>
                                    <p className="stat-number">{usuariosActivosHoy}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'usuarios' && (
                    <div className="tab-content">
                        <div className="search-section">
                            <div className="search-wrapper">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, correo o cédula..."
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                    className="search-input"
                                />
                                <span className="search-icon">🔍</span>
                            </div>
                            <div className="search-buttons">
                                <button onClick={handleBuscar} className="btn-search">Buscar</button>
                                <button onClick={cargarDatos} className="btn-reset">Limpiar</button>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table className="usuarios-table">
                                <thead>
                                    <tr>
                                        <th>Nombre Completo</th>
                                        <th>Correo</th>
                                        <th>Cédula</th>
                                        <th>Teléfono</th>
                                        <th>Rol</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.length > 0 ? (
                                        usuarios.map((user) => (
                                            <tr key={user.id}>
                                                <td><strong>{user.nombre} {user.apellido}</strong></td>
                                                <td>{user.correo}</td>
                                                <td>{user.cedula}</td>
                                                <td>{user.telefono || '-'}</td>
                                                <td><span className={`role-badge ${user.rol}`}>{user.rol}</span></td>
                                                <td>
                                                    <button
                                                        onClick={() => handleEliminar(user.id)}
                                                        className="btn-delete"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="empty-message">No hay usuarios para mostrar</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'registros' && (
                    <div className="tab-content">
                        <div className="table-wrapper">
                            <table className="registros-table">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
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
                                                <td><strong>{registro.nombre} {registro.apellido}</strong></td>
                                                <td>{new Date(registro.hora_entrada).toLocaleDateString('es-CO')}</td>
                                                <td>{new Date(registro.hora_entrada).toLocaleTimeString('es-CO')}</td>
                                                <td>{registro.hora_salida ? new Date(registro.hora_salida).toLocaleTimeString('es-CO') : '-'}</td>
                                                <td>{registro.duracion || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="empty-message">No hay registros de asistencia</td></tr>
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

export default DashboardAdmin;
