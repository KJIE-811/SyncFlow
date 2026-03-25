import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, login as loginService, register as registerService, resetPassword as resetPasswordService, saveSession, getSession, clearSession, LoginData, RegisterData, ResetPasswordData } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (data: ResetPasswordData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginData) => {
    const result = await loginService(data);
    if (result.success && result.user) {
      setUser(result.user);
      saveSession(result.user);
    }
    return result;
  };

  const register = async (data: RegisterData) => {
    const result = await registerService(data);
    return result;
  };

  const resetPassword = async (data: ResetPasswordData) => {
    const result = await resetPasswordService(data);
    return result;
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
