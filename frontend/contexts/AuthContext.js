"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }
  }, [session]);

  const loginWithGoogle = async () => {
    try {
      await signIn('google', { redirect: true, callbackUrl: '/' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithLinkedIn = async () => {
    try {
      await signIn('linkedin', { redirect: true, callbackUrl: '/' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (data) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        return { success: false, error: responseData.detail || "Registration failed" };
      }

      // Automatically log in after successful registration
      return await login(data.email, data.password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const updateProfile = async (updatedUserData) => {
    // In NextAuth, session updates use the update function
    if (update && updatedUserData) {
      await update(updatedUserData);
    } else {
      window.location.reload();
    }
  };

  const value = {
    user,
    token: null, // Token is managed by NextAuth HTTP-only cookies now
    loading: status === 'loading',
    login,
    loginWithGoogle,
    loginWithLinkedIn,
    register,
    logout,
    updateProfile,
    isAuthenticated: status === 'authenticated',
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
