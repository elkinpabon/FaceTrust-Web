import React from 'react';

const Logo = ({ size = 32 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'inline-block' }}
        >
            {/* Fondo circular elegante */}
            <circle cx="32" cy="32" r="31" stroke="#1a3a3a" strokeWidth="1.5" />
            
            {/* Marco de rostro elegante con gradiente de confianza */}
            <g>
                {/* Contorno superior del rostro */}
                <path
                    d="M 20 18 Q 32 10 44 18"
                    stroke="#1a3a3a"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* Contorno lateral izquierdo */}
                <path
                    d="M 20 18 Q 15 28 18 40"
                    stroke="#2d4a4a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
                
                {/* Contorno lateral derecho */}
                <path
                    d="M 44 18 Q 49 28 46 40"
                    stroke="#2d4a4a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
            </g>
            
            {/* Ojos elegantes con brillo */}
            <g>
                {/* Ojo izquierdo */}
                <ellipse cx="25" cy="26" rx="3" ry="4" fill="#1a3a3a" />
                <circle cx="25.5" cy="25" r="1" fill="white" />
                
                {/* Ojo derecho */}
                <ellipse cx="39" cy="26" rx="3" ry="4" fill="#1a3a3a" />
                <circle cx="39.5" cy="25" r="1" fill="white" />
            </g>
            
            {/* Líneas de escaneo de seguridad */}
            <g stroke="#0d7377" strokeWidth="1" opacity="0.6">
                <line x1="16" y1="32" x2="48" y2="32" strokeDasharray="2,2" />
            </g>
            
            {/* Líneas horizontales de verificación */}
            <g>
                <path
                    d="M 18 36 Q 32 38 46 36"
                    stroke="#2d4a4a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
                <path
                    d="M 18 40 Q 32 42 46 40"
                    stroke="#2d4a4a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
            </g>
            
            {/* Símbolo de verificación/seguridad en esquina */}
            <g>
                <circle cx="50" cy="18" r="6" fill="#0d7377" opacity="0.2" />
                <path
                    d="M 48 18 L 50 20 L 52 16"
                    stroke="#0d7377"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
};

export default Logo;
