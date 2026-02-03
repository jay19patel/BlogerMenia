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
  const loadingRef = useRef(false); // Prevent duplicate calls
  const mountedRef = useRef(false);

  const loadUser = useCallback(async (accessToken) => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('Already loading user, skipping...');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const userData = await api.getCurrentUser(accessToken);
      setUser(userData);
      console.log('User loaded successfully:', userData);
    } catch (error) {
      console.error('Failed to load user:', error);

      // Only clear token if it's a 401 (invalid token), not on network errors
      // Only clear token if it's a 401 (invalid token)
      // We check error.status (attached by api.js), error.response.status, or specific error messages
      const isAuthError =
        error.status === 401 ||
        (error.response && error.response.status === 401) ||
        error.message.includes('401') ||
        error.message.toLowerCase().includes('token not valid') ||
        error.message.toLowerCase().includes('credentials');

      if (isAuthError) {
        console.log('Invalid token (401), clearing...');
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
      } else {
        // Network error or other issue - keep token but don't set user
        console.log('Network error, keeping token for retry');
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Prevent multiple calls
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    // Check for token in localStorage on mount - only once
    const storedToken = localStorage.getItem('access_token');
    console.log('AuthContext mounted, token:', storedToken ? 'exists' : 'none');

    if (storedToken) {
      setToken(storedToken);
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency array - run only once on mount

  const loginWithGoogle = async (code) => {
    try {
      const response = await api.googleLogin(code);
      const token = response.access_token || response.key || response.access; // Support 'access' key for JWT

      // Store token
      localStorage.setItem('access_token', token);
      setToken(token);

      // Load user data
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

      // Store token
      localStorage.setItem('access_token', accessToken);
      setToken(accessToken);
      console.log('Token stored:', accessToken);

      // Load user data
      await loadUser(accessToken);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (data) => {
    try {
      // 1. Prepare registration payload (dj-rest-auth expects valid keys)
      const registerPayload = {
        username: data.username,
        email: data.email,
        // Backend requires 'password1' and 'password2' specifically
        password1: data.password,
        password2: data.confirmPassword || data.password,
      };

      await api.register(registerPayload);

      // 2. Auto login after registration
      console.log('Auto login after registration');
      const loginResult = await login(data.email, data.password);

      // 3. Update profile with full name if provided and login successful
      if (loginResult.success && data.full_name) {
        try {
          const names = data.full_name.trim().split(' ');
          const firstName = names[0];
          const lastName = names.slice(1).join(' ') || '';

          // Get token from login result or state
          const token = loginResult.token || localStorage.getItem('access_token');

          if (token) {
            await api.updateUserProfile(token, {
              first_name: firstName,
              last_name: lastName
            });
            // Reload user to get the updated name
            await loadUser(token);
          }
        } catch (updateError) {
          console.error("Failed to update profile name after registration:", updateError);
          // Don't fail the whole registration if name update fails, just log it
        }
      }

      return loginResult;
    } catch (error) {
      if (error.response && error.response.data) {
        // Format Django backend errors into a readable string
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
      // Clear local state regardless of API call success
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      router.push('/');
      console.log('Logged out');
    }
  };

  const setAuthFromToken = useCallback(async (accessToken) => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('Already loading, skipping setAuthFromToken');
      return;
    }

    // Store token
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    // Load user data
    await loadUser(accessToken);
  }, [loadUser]);

  const updateProfile = async (updatedUserData) => {
    try {
      await loadUser(token); // Reload user data from server
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
