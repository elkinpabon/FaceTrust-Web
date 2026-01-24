/**
 * Register Form Component
 * WebAuthn Biometric Registration with Liveness Detection
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { WebAuthnService } from '@/lib/services/webauthn.service';
import { LivenessDetector } from '@/components/liveness';
import { LivenessCheckResult } from '@/types';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });
  const [step, setStep] = useState<'form' | 'liveness' | 'webauthn'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(true);

  React.useEffect(() => {
    const supported = WebAuthnService.isSupported();
    setWebauthnSupported(supported);
    if (!supported) {
      setError('Tu navegador no soporta autenticación biométrica (WebAuthn)');
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return;
    }

    if (!formData.name || formData.name.length < 2) {
      setError('Por favor ingresa tu nombre completo');
      return;
    }

    // Pasar a verificación de liveness
    setStep('liveness');
  };

  const handleLivenessDetected = async (result: LivenessCheckResult) => {
    if (!result.isLive) {
      setError('No se pudo verificar que seas una persona real');
      return;
    }

    // Proceder a WebAuthn
    setStep('webauthn');
    await handleWebAuthnRegistration();
  };

  const handleWebAuthnRegistration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await WebAuthnService.registerCredential(
        formData.email,
        formData.name
      );
      
      // Auto-login después del registro
      if (response.user && response.tokens) {
        setUser(response.user);
        setTokens(response.tokens);

        // Redirigir según rol
        if (response.user.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/client');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Intenta de nuevo.');
      setStep('form'); // Volver al inicio
    } finally {
      setIsLoading(false);
    }
  };

  const handleLivenessError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
          <h2 className="text-2xl font-bold text-white text-center">
            ✨ Registro FaceTrust
          </h2>
          <p className="text-green-100 text-sm text-center mt-2">
            Crea tu cuenta con biometría
          </p>
        </div>

        <div className="p-6">
          {/* Step 1: Form */}
          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                  required
                  disabled={!webauthnSupported}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="tu@email.com"
                  required
                  disabled={!webauthnSupported}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!webauthnSupported || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continuar
              </button>

              <div className="text-center">
                <a
                  href="/login"
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </a>
              </div>
            </form>
          )}

          {/* Step 2: Liveness Detection */}
          {step === 'liveness' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Escaneo Facial</h3>
                <p className="text-sm text-gray-600">
                  Verifica tu identidad para crear tu cuenta
                </p>
              </div>

              <LivenessDetector
                onLivenessDetected={handleLivenessDetected}
                onError={handleLivenessError}
                autoStart={true}
                requireHeadMovement={true}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={() => setStep('form')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg"
              >
                Volver
              </button>
            </div>
          )}

          {/* Step 3: WebAuthn */}
          {step === 'webauthn' && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registrando credencial...</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Configura tu huella, Face ID o Windows Hello
                </p>
              </div>

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                  <button
                    onClick={() => setStep('form')}
                    className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          🔒 Tus datos biométricos nunca abandonan tu dispositivo
        </p>
      </div>
    </div>
  );
};
