import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import FaceScanner from '../components/FaceScanner.jsx';
import '../styles/auth.css';

const Registro = () => {
    const [paso, setPaso] = useState(1);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        cedula: '',
        correo: '',
        contraseña: '',
        telefono: '',
        direccion: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleRegistroPaso1 = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const response = await authService.registro(formData);
            localStorage.setItem('usuarioRegistroId', response.data.usuarioId);
            setPaso(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar');
        } finally {
            setCargando(false);
        }
    };

    const handleCapturarRostro = async (blob) => {
        setCargando(true);
        setError('');

        try {
            const usuarioId = localStorage.getItem('usuarioRegistroId');
            await authService.guardarImagenFacial(usuarioId, blob);

            localStorage.removeItem('usuarioRegistroId');
            navigate('/login');
            alert('Registro completado. Ahora inicia sesión con tus credenciales.');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar imagen facial');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Reconocimiento Facial</h1>
                <h2>{paso === 1 ? 'Registro de Datos' : 'Escaneo Facial'}</h2>

                {error && <div className="error-message">{error}</div>}

                {paso === 1 ? (
                    <form onSubmit={handleRegistroPaso1}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <input
                                    type="text"
                                    name="apellido"
                                    value={formData.apellido}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Cédula</label>
                            <input
                                type="text"
                                name="cedula"
                                value={formData.cedula}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Correo Electrónico</label>
                            <input
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Contraseña</label>
                            <input
                                type="password"
                                name="contraseña"
                                value={formData.contraseña}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={cargando} className="auth-button">
                            {cargando ? 'Registrando...' : 'Continuar'}
                        </button>
                    </form>
                ) : (
                    <div>
                        <FaceScanner 
                            onCapture={handleCapturarRostro} 
                            titulo="Captura tu Rostro"
                            nombreUsuario={`${formData.nombre} ${formData.apellido}`}
                        />
                        {cargando && <p className="loading-message">Guardando tu imagen facial...</p>}
                    </div>
                )}

                <p className="auth-link">
                    ¿Ya tienes cuenta? <a href="/login">Inicia sesión aquí</a>
                </p>
            </div>
        </div>
    );
};

export default Registro;
