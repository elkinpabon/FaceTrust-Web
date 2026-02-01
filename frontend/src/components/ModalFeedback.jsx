import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import '../styles/modalFeedback.css';

const ModalFeedback = ({ isOpen, tipo, titulo, mensaje, cambios, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-feedback-overlay" onClick={onClose}>
            <div className="modal-feedback-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-feedback-header">
                    <div className="modal-feedback-icon-container">
                        {tipo === 'success' ? (
                            <CheckCircle className="modal-feedback-icon success" size={40} />
                        ) : (
                            <AlertCircle className="modal-feedback-icon error" size={40} />
                        )}
                    </div>
                    <h2 className="modal-feedback-titulo">{titulo}</h2>
                    <button className="modal-feedback-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-feedback-body">
                    <p className="modal-feedback-mensaje">{mensaje}</p>

                    {cambios && cambios.length > 0 && (
                        <div className="cambios-lista">
                            <h3 className="cambios-titulo">Cambios realizados:</h3>
                            <ul className="cambios-items">
                                {cambios.map((cambio, index) => (
                                    <li key={index} className="cambio-item">
                                        <span className="campo-nombre">{cambio.campo}:</span>
                                        <div className="valor-cambio">
                                            <span className="valor-anterior">{cambio.anterior}</span>
                                            <span className="flecha">→</span>
                                            <span className="valor-nuevo">{cambio.nuevo}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="modal-feedback-footer">
                    <button className="btn-feedback-cerrar" onClick={onClose}>
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalFeedback;
