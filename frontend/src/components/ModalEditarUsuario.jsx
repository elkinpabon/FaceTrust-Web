import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usuarioService } from '../services/api.js';
import ModalFeedback from './ModalFeedback.jsx';
import '../styles/modal.css';

const ModalEditarUsuario = ({ usuario, isOpen, onClose, onGuardar }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        correo: '',
        telefono: '',
        direccion: '',
        rol: 'usuario'
    });
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState({
        isOpen: false,
        tipo: 'success',
        titulo: '',
        mensaje: '',
        cambios: []
    });

    // Cargar datos del usuario cuando cambie
    useEffect(() => {
        if (usuario && isOpen) {
            setFormData({
                nombre: usuario.nombre || '',
                apellido: usuario.apellido || '',
                correo: usuario.correo || '',
                telefono: usuario.telefono || '',
                direccion: usuario.direccion || '',
                rol: usuario.rol || 'usuario'
            });
            setError('');
        }
    }, [usuario, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const detectarCambios = () => {
        const cambios = [];
        
        if (formData.nombre !== usuario.nombre) {
            cambios.push({
                campo: 'nombre',
                anterior: usuario.nombre,
                nuevo: formData.nombre
            });
        }
        
        if (formData.apellido !== usuario.apellido) {
            cambios.push({
                campo: 'apellido',
                anterior: usuario.apellido,
                nuevo: formData.apellido
            });
        }
        
        if (formData.correo !== usuario.correo) {
            cambios.push({
                campo: 'correo',
                anterior: usuario.correo,
                nuevo: formData.correo
            });
        }
        
        if (formData.telefono !== (usuario.telefono || '')) {
            cambios.push({
                campo: 'teléfono',
                anterior: usuario.telefono || '(sin teléfono)',
                nuevo: formData.telefono || '(sin teléfono)'
            });
        }
        
        if (formData.direccion !== (usuario.direccion || '')) {
            cambios.push({
                campo: 'dirección',
                anterior: usuario.direccion || '(sin dirección)',
                nuevo: formData.direccion || '(sin dirección)'
            });
        }
        
        if (formData.rol !== usuario.rol) {
            cambios.push({
                campo: 'rol',
                anterior: usuario.rol,
                nuevo: formData.rol
            });
        }
        
        return cambios;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        // Validar campos
        if (!formData.nombre.trim() || !formData.apellido.trim()) {
            setError('Nombre y apellido son obligatorios');
            setCargando(false);
            return;
        }

        if (!formData.correo.trim() || !/\S+@\S+\.\S+/.test(formData.correo)) {
            setError('Correo electrónico inválido');
            setCargando(false);
            return;
        }

        try {
            const cambios = detectarCambios();
            
            if (cambios.length === 0) {
                setFeedback({
                    isOpen: true,
                    tipo: 'warning',
                    titulo: 'Sin cambios',
                    mensaje: 'No se realizaron cambios en los datos del usuario.',
                    cambios: []
                });
                setCargando(false);
                return;
            }

            await usuarioService.actualizar(usuario.id, formData);
            
            setFeedback({
                isOpen: true,
                tipo: 'success',
                titulo: 'Actualización exitosa',
                mensaje: `Se actualizó ${cambios.length} campo${cambios.length !== 1 ? 's' : ''} del usuario correctamente.`,
                cambios: cambios
            });
            
            setTimeout(() => {
                onGuardar();
                onClose();
            }, 2000);
        } catch (err) {
            setFeedback({
                isOpen: true,
                tipo: 'error',
                titulo: 'Error en la actualización',
                mensaje: err.response?.data?.error || 'No se pudo actualizar el usuario. Intenta de nuevo.',
                cambios: []
            });
        } finally {
            setCargando(false);
        }
    };

    const closeFeedback = () => {
        setFeedback({
            ...feedback,
            isOpen: false
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Editar Usuario</h2>
                        <button onClick={onClose} className="modal-close">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleGuardar} className="modal-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
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
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Correo</label>
                            <input
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Rol</label>
                                <select
                                    name="rol"
                                    value={formData.rol}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="usuario">Usuario</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Dirección</label>
                            <textarea
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleInputChange}
                                className="form-input"
                                rows="3"
                            />
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn-cancel">
                                Cancelar
                            </button>
                            <button type="submit" disabled={cargando} className="btn-save">
                                {cargando ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <ModalFeedback
                isOpen={feedback.isOpen}
                tipo={feedback.tipo}
                titulo={feedback.titulo}
                mensaje={feedback.mensaje}
                cambios={feedback.cambios}
                onClose={closeFeedback}
            />
        </>
    );
};

export default ModalEditarUsuario;
