/**
 * API Client Service
 * Axios configuration for Flask backend communication
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens, ApiError } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - agregar token JWT
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        console.log('[RequestInterceptor] URL:', config.url, 'Has token:', !!token);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[RequestInterceptor] Authorization header set');
        } else if (!token) {
          console.log('[RequestInterceptor] No token available');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - manejar errores y refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Si el token expiró, intentar refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const { data } = await this.client.post<AuthTokens>('/auth/refresh', {
                refresh_token: refreshToken,
              });

              this.setTokens(data);

              // Reintentar request original con nuevo token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh falló, limpiar tokens y redirigir a login
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      console.error('getAccessToken: window is undefined (SSR context)');
      return null;
    }
    const token = localStorage.getItem('access_token');
    console.log('[getAccessToken] Retrieved token:', token ? token.substring(0, 20) + '...' : 'null');
    return token;
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      console.error('getRefreshToken: window is undefined (SSR context)');
      return null;
    }
    return localStorage.getItem('refresh_token');
  }

  public setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') {
      console.error('setTokens: window is undefined (SSR context)');
      return;
    }
    console.log('[setTokens] Saving tokens:', {
      access_token: tokens.access_token?.substring(0, 20) + '...',
      refresh_token: tokens.refresh_token?.substring(0, 20) + '...',
    });
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    console.log('[setTokens] Verification - access_token in localStorage:', localStorage.getItem('access_token')?.substring(0, 20) + '...');
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // HTTP methods
  public async get<T>(url: string, config?: any) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: any) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: any) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: any) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: any, config?: any) {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
