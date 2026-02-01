import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, CheckCircle, LogOut, Search, Trash2, Edit, History, Lock } from 'lucide-react';
import { usuarioService, registroService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import ModalEditarUsuario from '../components/ModalEditarUsuario.jsx';
import '../styles/admin.css';

const DashboardAdmin = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [registros, setRegistros] = useState([]);
    const [logsLogin, setLogsLogin] = useState([]);
    const [historialCambios, setHistorialCambios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('dashboard');
    const [filtro, setFiltro] = useState('');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const usuariosData = await usuarioService.obtenerTodos('');
            setUsuarios(usuariosData.data);

            const registrosData = await registroService.obtenerTodos();
            setRegistros(registrosData.data);

            const logsData = await usuarioService.obtenerLogsLogin();
            setLogsLogin(logsData.data || []);

            const historialData = await usuarioService.obtenerHistorialCambios();
            setHistorialCambios(historialData.data || []);
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

    const handleEditar = (user) => {
        setUsuarioSeleccionado(user);
        setModalAbierto(true);
    };

    const handleGuardarCambios = () => {
        cargarDatos();
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
                    <button
                        className={`tab-button ${tab === 'logs' ? 'active' : ''}`}
                        onClick={() => setTab('logs')}
                    >
                        <Lock size={18} style={{marginRight: '8px'}} />
                        Logs de Login
                    </button>
                    <button
                        className={`tab-button ${tab === 'historial' ? 'active' : ''}`}
                        onClick={() => setTab('historial')}
                    >
                        <History size={18} style={{marginRight: '8px'}} />
                        Historial de Cambios
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
                                                        onClick={() => handleEditar(user)}
                                                        className="btn-edit"
                                                        title="Editar usuario"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEliminar(user.id)}
                                                        className="btn-delete"
                                                        title="Eliminar usuario"
                                                    >
                                                        <Trash2 size={16} />
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

                {tab === 'logs' && (
                    <div className="tab-content">
                        <div className="table-wrapper">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Correo</th>
                                        <th>Fecha y Hora</th>
                                        <th>Estado</th>
                                        <th>Tipo de Error</th>
                                        <th>Dirección IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsLogin.length > 0 ? (
                                        logsLogin.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)).map((log) => (
                                            <tr key={log.id}>
                                                <td><strong>{log.usuario_nombre || 'Desconocido'}</strong></td>
                                                <td>{log.usuario_email}</td>
                                                <td>{new Date(log.fecha_hora).toLocaleString('es-CO')}</td>
                                                <td>
                                                    <span className={`status-badge ${log.estado}`}>
                                                        {log.estado === 'exitoso' ? '✓ Exitoso' : '✗ Fallido'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`error-type-badge ${log.estado}`}>
                                                        {log.tipo_error === '-' ? '-' : log.tipo_error.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td>{log.ip_address || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="empty-message">No hay logs de login</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'historial' && (
                    <div className="tab-content">
                        <div className="table-wrapper">
                            <table className="historial-table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Correo</th>
                                        <th>Campo Modificado</th>
                                        <th>Valor Anterior</th>
                                        <th>Valor Nuevo</th>
                                        <th>Modificado por</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historialCambios.length > 0 ? (
                                        historialCambios.sort((a, b) => new Date(b.fecha_cambio) - new Date(a.fecha_cambio)).map((cambio) => (
                                            <tr key={cambio.id}>
                                                <td><strong>{cambio.usuario_nombre || 'Desconocido'}</strong></td>
                                                <td>{cambio.usuario_email || '-'}</td>
                                                <td>
                                                    <span className="field-badge">{cambio.campo_modificado || cambio.rol_anterior ? 'rol' : cambio.campo_modificado}</span>
                                                </td>
                                                <td>
                                                    <span className="value-badge anterior">{cambio.valor_anterior || cambio.rol_anterior || '-'}</span>
                                                </td>
                                                <td>
                                                    <span className="value-badge nuevo">{cambio.valor_nuevo || cambio.rol_nuevo || '-'}</span>
                                                </td>
                                                <td>{cambio.modificado_por || 'Sistema'}</td>
                                                <td>{new Date(cambio.fecha_cambio).toLocaleString('es-CO')}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="7" className="empty-message">No hay cambios registrados</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <ModalEditarUsuario
                usuario={usuarioSeleccionado}
                isOpen={modalAbierto}
                onClose={() => {
                    setModalAbierto(false);
                    setUsuarioSeleccionado(null);
                }}
                onGuardar={handleGuardarCambios}
            />
        </div>
    );
};

export default DashboardAdmin;
