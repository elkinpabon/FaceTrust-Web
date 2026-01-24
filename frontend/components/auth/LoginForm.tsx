/**
 * Login Form Component
 * WebAuthn Biometric Authentication
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { WebAuthnService } from '@/lib/services/webauthn.service';
import { LivenessDetector } from '@/components/liveness';
import { LivenessCheckResult } from '@/types';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'liveness' | 'webauthn'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessCheckResult | null>(null);

  useEffect(() => {
    // Verificar soporte de WebAuthn
    const supported = WebAuthnService.isSupported();
    setWebauthnSupported(supported);
    if (!supported) {
      setError('Tu navegador no soporta autenticación biométrica (WebAuthn)');
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return;
    }

    // Pasar a verificación de liveness
    setStep('liveness');
  };

  const handleLivenessDetected = async (result: LivenessCheckResult) => {
    console.log('Liveness check result:', result);
    setLivenessResult(result);

    if (!result.isLive) {
      setError('No se pudo verificar que seas una persona real');
      return;
    }

    // Proceder a WebAuthn
    setStep('webauthn');
    await handleWebAuthnLogin();
  };

  const handleWebAuthnLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await WebAuthnService.authenticate(email);
      
      // Guardar usuario y tokens
      setUser(response.user);
      setTokens(response.tokens);

      // Redirigir según rol
      if (response.user.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/client');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al autenticar. Verifica tus credenciales.');
      setStep('email'); // Volver al inicio
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white text-center">
            🔐 FaceTrust Login
          </h2>
          <p className="text-blue-100 text-sm text-center mt-2">
            Autenticación biométrica segura
          </p>
        </div>

        <div className="p-6">
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continuar
              </button>

              <div className="text-center">
                <a
                  href="/register"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ¿No tienes cuenta? Regístrate
                </a>
              </div>
            </form>
          )}

          {/* Step 2: Liveness Detection */}
          {step === 'liveness' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Verificación de Vida</h3>
                <p className="text-sm text-gray-600">
                  Confirma que eres una persona real antes de acceder
                </p>
              </div>

              <LivenessDetector
                onLivenessDetected={handleLivenessDetected}
                onError={handleLivenessError}
                autoStart={true}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={() => setStep('email')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Step 3: WebAuthn */}
          {step === 'webauthn' && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Autenticando...</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Usa tu huella, Face ID o Windows Hello para confirmar tu identidad
                </p>
              </div>

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                  <button
                    onClick={() => setStep('email')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
