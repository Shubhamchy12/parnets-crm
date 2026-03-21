import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const res = await authService.me();
          if (res.data?.success) setUser(res.data.data.user);
          else clearAuth();
        } catch {
          clearAuth();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  };

  const logout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
