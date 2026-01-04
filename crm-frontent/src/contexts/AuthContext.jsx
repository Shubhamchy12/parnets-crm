import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        try {
          // Verify token is still valid
          const response = await apiService.getCurrentUser();
          if (response.success) {
            setUser(response.data.user);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('refreshToken');
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Token is invalid, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await apiService.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }, 23 * 60 * 60 * 1000); // Refresh every 23 hours (token expires in 24h)

    return () => clearInterval(refreshInterval);
  }, [user]);

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    setUser,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};