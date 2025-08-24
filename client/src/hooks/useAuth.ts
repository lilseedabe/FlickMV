import { useState, useEffect } from 'react';
import { authAPI, handleApiError } from '@/utils/api';
import { STORAGE_KEYS } from '@/utils/constants';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuth = (): AuthState & AuthActions => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      loadUserProfile();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await authAPI.getProfile() as any;
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load user profile:', error);
      localStorage.removeItem(STORAGE_KEYS.authToken);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await authAPI.login(email, password);
      const { user, token } = response as any;
      
      localStorage.setItem(STORAGE_KEYS.authToken, token);
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await authAPI.register(name, email, password);
      const { user, token } = response as any;
      
      localStorage.setItem(STORAGE_KEYS.authToken, token);
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    });
    
    // Optionally call logout API to invalidate token on server
    authAPI.logout().catch(console.error);
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const updatedUser = await authAPI.updateProfile(data) as any;
      setState(prev => ({
        ...prev,
        user: updatedUser
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await authAPI.changePassword(currentPassword, newPassword);
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError
  };
};
