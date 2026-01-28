import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuarioService, registroService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
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
        return <div className="loading">Cargando...</div>;
    }

    const totalUsuarios = usuarios.length;
    const totalRegistros = registros.length;

    return (
        <div className="admin-dashboard">
            <nav className="navbar">
                <h1>Panel Administrativo</h1>
                <div className="navbar-right">
                    <span className="admin-name">{usuario?.nombre}</span>
                    <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
                </div>
            </nav>

            <div className="admin-container">
                <div className="welcome-section">
                    <h2>Bienvenido, Administrador</h2>
                    <p className="welcome-subtitle">Gestiona empleados y registros de asistencia</p>
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setTab('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`tab ${tab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => setTab('usuarios')}
                    >
                        Gestión Usuarios
                    </button>
                    <button
                        className={`tab ${tab === 'registros' ? 'active' : ''}`}
                        onClick={() => setTab('registros')}
                    >
                        Registros Asistencia
                    </button>
                </div>

                {tab === 'dashboard' && (
                    <div className="tab-content">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Total Usuarios</h3>
                                <p className="stat-number">{totalUsuarios}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Total Registros</h3>
                                <p className="stat-number">{totalRegistros}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Usuarios Activos Hoy</h3>
                                <p className="stat-number">{new Set(registros.map(r => r.usuario_id)).size}</p>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'usuarios' && (
                    <div className="tab-content">
                        <div className="search-section">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, correo o cédula"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                className="search-input"
                            />
                            <button onClick={handleBuscar} className="btn-buscar">Buscar</button>
                            <button onClick={cargarDatos} className="btn-reset">Limpiar</button>
                        </div>

                        <table className="usuarios-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
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
                                            <td>{user.nombre} {user.apellido}</td>
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
                                    <tr><td colSpan="6">No hay usuarios</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'registros' && (
                    <div className="tab-content">
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
                                            <td>{registro.nombre} {registro.apellido}</td>
                                            <td>{new Date(registro.hora_entrada).toLocaleDateString()}</td>
                                            <td>{new Date(registro.hora_entrada).toLocaleTimeString()}</td>
                                            <td>{registro.hora_salida ? new Date(registro.hora_salida).toLocaleTimeString() : '-'}</td>
                                            <td>{registro.duracion || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5">No hay registros</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardAdmin;
