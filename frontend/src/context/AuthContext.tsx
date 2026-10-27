import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type User,
  apiLogin,
  apiRegister,
  apiGetMe,
  apiLogout,
  apiUpdateProfile,
  apiChangePassword,
  apiForgotPassword,
  apiResetPassword,
  apiVerifyEmail,
} from '../services/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string, confirmPass: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPass: string, confirmPass: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raven_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('raven_auth_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await apiGetMe();
      setUser(userData);
      setToken(storedToken);
    } catch {
      localStorage.removeItem('raven_auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    localStorage.setItem('raven_auth_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, passwordConfirm: string) => {
    await apiRegister({
      name,
      email,
      password,
      password_confirm: passwordConfirm,
    });
    // Automatic login after registration
    await login(email, password);
  };

  const logout = async () => {
    await apiLogout();
    localStorage.removeItem('raven_auth_token');
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (name: string) => {
    const updated = await apiUpdateProfile(name);
    setUser(updated);
  };

  const changePassword = async (currentPass: string, newPass: string, confirmPass: string) => {
    await apiChangePassword({
      current_password: currentPass,
      new_password: newPass,
      new_password_confirm: confirmPass,
    });
  };

  const verifyEmail = async (tokenStr: string): Promise<string> => {
    const res = await apiVerifyEmail(tokenStr);
    await refreshUser();
    return res.message;
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await apiForgotPassword(email);
    return res.message;
  };

  const resetPassword = async (tokenStr: string, newPass: string, confirmPass: string): Promise<string> => {
    const res = await apiResetPassword({
      token: tokenStr,
      new_password: newPass,
      new_password_confirm: confirmPass,
    });
    return res.message;
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
        verifyEmail,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
