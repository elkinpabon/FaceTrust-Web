/**
 * Authentication Store
 * Global state management for user authentication
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { apiClient } from '@/lib/services/api.service';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      setTokens: (tokens) => {
        apiClient.setTokens(tokens);
        
        // Decodificar token para obtener info del usuario
        try {
          const decoded: any = jwtDecode(tokens.access_token);
          
          // El token debe contener información del usuario
          if (decoded.sub) {
            // Cargar usuario completo del servidor
            get().checkAuth();
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      },

      logout: () => {
        apiClient.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          
          const token = localStorage.getItem('access_token');
          if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Obtener perfil del usuario actual
          const user = await apiClient.get<User>('/auth/me');
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          console.error('Auth check failed:', error);
          apiClient.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      refreshAuth: async () => {
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const tokens = await apiClient.post<AuthTokens>('/auth/refresh', {
            refresh_token: refreshToken,
          });

          get().setTokens(tokens);
        } catch (error) {
          console.error('Refresh failed:', error);
          get().logout();
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Solo persistir user
    }
  )
);
