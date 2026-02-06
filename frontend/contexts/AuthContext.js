"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const router = useRouter();
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  const loadUser = useCallback(async (accessToken) => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const userData = await api.getCurrentUser(accessToken);
      setUser(userData);
      console.log('User loaded successfully:', userData);
    } catch (error) {
      const isAuthError =
        error.status === 401 ||
        (error.response && error.response.status === 401) ||
        error.message.includes('401') ||
        error.message.toLowerCase().includes('token not valid') ||
        error.message.toLowerCase().includes('credentials') ||
        error.message.toLowerCase().includes('given token not valid');

      if (isAuthError) {
        console.warn('Authentication session expired or invalid. Clearing session.');
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
      } else {
        console.error('Failed to load user:', error);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    const storedToken = localStorage.getItem('access_token');
    console.log('AuthContext mounted, token:', storedToken ? 'exists' : 'none');

    if (storedToken) {
      setToken(storedToken);
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const loginWithGoogle = async (code) => {
    try {
      const response = await api.googleLogin(code);
      const token = response.access_token || response.key || response.access;

      localStorage.setItem('access_token', token);
      setToken(token);

      await loadUser(token);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      const accessToken = response.access_token || response.key || response.access;

      localStorage.setItem('access_token', accessToken);
      setToken(accessToken);
      console.log('Token stored:', accessToken);

      await loadUser(accessToken);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (data) => {
    try {
      const registerPayload = {
        username: data.username,
        email: data.email,
        password1: data.password,
        password2: data.confirmPassword || data.password,
      };

      await api.register(registerPayload);

      console.log('Auto login after registration');
      const loginResult = await login(data.email, data.password);

      if (loginResult.success && data.full_name) {
        try {
          const names = data.full_name.trim().split(' ');
          const firstName = names[0];
          const lastName = names.slice(1).join(' ') || '';

          const token = loginResult.token || localStorage.getItem('access_token');

          if (token) {
            await api.updateUserProfile(token, {
              first_name: firstName,
              last_name: lastName
            });
            await loadUser(token);
          }
        } catch (updateError) {
          console.error("Failed to update profile name after registration:", updateError);
        }
      }

      return loginResult;
    } catch (error) {
      if (error.response && error.response.data) {
        const errors = error.response.data;
        let errorMessage = "";
        Object.keys(errors).forEach(key => {
          const messages = Array.isArray(errors[key]) ? errors[key].join(" ") : errors[key];
          errorMessage += `${key}: ${messages}\n`;
        });
        return { success: false, error: errorMessage.trim() || error.message };
      }
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      router.push('/');
      console.log('Logged out');
    }
  };

  const setAuthFromToken = useCallback(async (accessToken) => {
    if (loadingRef.current) {
      console.log('Already loading, skipping setAuthFromToken');
      return;
    }

    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    await loadUser(accessToken);
  }, [loadUser]);

  const updateProfile = async (updatedUserData) => {
    try {
      await loadUser(token);
    } catch (error) {
      console.error('Failed to reload user after update:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    setAuthFromToken,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
