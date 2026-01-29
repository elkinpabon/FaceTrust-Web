import React from 'react';
import '../styles/waveBackground.css';

const WaveBackground = () => {
    return (
        <div className="wave-background">
            <svg className="waves" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120">
                <defs>
                    <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#1a3a3a', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#0d1f1f', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
                <path 
                    d="M0,50 Q300,10 600,50 T1200,50 L1200,120 L0,120 Z" 
                    fill="url(#waveGradient1)" 
                    className="wave-path wave-1"
                />
                <path 
                    d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" 
                    fill="rgba(26, 58, 58, 0.5)" 
                    className="wave-path wave-2"
                />
                <path 
                    d="M0,70 Q300,30 600,70 T1200,70 L1200,120 L0,120 Z" 
                    fill="rgba(26, 58, 58, 0.3)" 
                    className="wave-path wave-3"
                />
            </svg>
        </div>
    );
};

export default WaveBackground;
