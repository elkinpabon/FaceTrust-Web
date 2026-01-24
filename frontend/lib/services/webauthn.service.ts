/**
 * WebAuthn Service
 * Client-side FIDO2 authentication using device biometrics
 */
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { apiClient } from './api.service';
import {
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
  LoginResponse,
} from '@/types';

export class WebAuthnService {
  /**
   * Registrar nueva credencial biométrica
   */
  static async registerCredential(email: string, name: string, deviceName?: string): Promise<any> {
    try {
      // 1. Solicitar opciones de registro al servidor
      const response = await apiClient.post<any>(
        '/auth/register-begin',
        { email, name }
      );
      
      // 2. Invocar API del navegador para crear credencial
      // El backend devuelve { options: "JSON string", user_id: number }
      if (!response || !response.options) {
        throw new Error('Invalid response from server: missing options');
      }
      
      const optionsJSON = typeof response.options === 'string' 
        ? JSON.parse(response.options) 
        : response.options;
      
      const credential = await startRegistration({ optionsJSON });

      // 3. Completar registro en el servidor
      const completeResponse = await apiClient.post('/auth/register-complete', {
        user_id: response.user_id,
        email,
        credential,
        device_name: deviceName || this.getDeviceName(),
      });

      return completeResponse;
    } catch (error: any) {
      console.error('WebAuthn Registration Error:', error);
      
      // Si es un error HTTP del backend, usar el mensaje del backend
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticación cancelada por el usuario');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('Credencial ya registrada en este dispositivo');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('WebAuthn no es soportado en este navegador');
      }
      
      throw error;
    }
  }

  /**
   * Autenticar con credencial biométrica existente
   */
  static async authenticate(email: string): Promise<LoginResponse> {
    try {
      // 1. Solicitar opciones de autenticación al servidor
      const response = await apiClient.post<any>(
        '/auth/login-begin',
        { email }
      );

      // 2. Parsear opciones si vienen como string JSON
      if (!response || !response.options) {
        throw new Error('Invalid response from server: missing options');
      }
      
      const optionsJSON = typeof response.options === 'string' 
        ? JSON.parse(response.options) 
        : response.options;

      // 3. Invocar API del navegador para obtener assertion
      const assertion = await startAuthentication({ optionsJSON });

      // 4. Completar autenticación en el servidor
      const loginResponse = await apiClient.post<LoginResponse>(
        '/auth/login-complete',
        {
          user_id: response.user_id,
          assertion: assertion,
        }
      );

      // 5. Guardar tokens
      console.log('[authenticate] Full login response:', loginResponse);
      console.log('[authenticate] Response tokens object:', loginResponse.tokens);
      console.log('[authenticate] Calling setTokens with:', loginResponse.tokens);
      
      if (!loginResponse.tokens) {
        throw new Error('No tokens in login response: ' + JSON.stringify(loginResponse));
      }
      
      apiClient.setTokens(loginResponse.tokens);
      console.log('[authenticate] Tokens should be saved. Checking localStorage...');
      const savedToken = localStorage.getItem('access_token');
      console.log('[authenticate] localStorage.getItem("access_token"):', savedToken ? savedToken.substring(0, 30) + '...' : 'NOT FOUND');

      return loginResponse;
    } catch (error: any) {
      console.error('WebAuthn Authentication Error:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticación cancelada por el usuario');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('No se encontró credencial para este usuario');
      }
      
      throw error;
    }
  }

  /**
   * Verificar si el navegador soporta WebAuthn
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'
    );
  }

  /**
   * Verificar disponibilidad de autenticación de plataforma (FaceID, Windows Hello, etc)
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Obtener nombre del dispositivo
   */
  private static getDeviceName(): string {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(ua)) {
      return 'iPhone/iPad';
    } else if (/Android/.test(ua)) {
      return 'Android Device';
    } else if (/Mac/.test(ua)) {
      return 'Mac';
    } else if (/Windows/.test(ua)) {
      return 'Windows PC';
    } else if (/Linux/.test(ua)) {
      return 'Linux PC';
    }
    
    return 'Unknown Device';
  }

  /**
   * Obtener tipo de autenticador disponible
   */
  static async getAuthenticatorInfo(): Promise<{
    supported: boolean;
    platformAvailable: boolean;
    deviceType: string;
  }> {
    return {
      supported: this.isSupported(),
      platformAvailable: await this.isPlatformAuthenticatorAvailable(),
      deviceType: this.getDeviceName(),
    };
  }
}
