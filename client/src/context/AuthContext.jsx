import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored =
        localStorage.getItem('eduretain_user') || sessionStorage.getItem('eduretain_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(
    () => localStorage.getItem('eduretain_token') || sessionStorage.getItem('eduretain_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            if (localStorage.getItem('eduretain_token')) {
              localStorage.setItem('eduretain_user', JSON.stringify(res.data.user));
            } else {
              sessionStorage.setItem('eduretain_user', JSON.stringify(res.data.user));
            }
            initSocket(res.data.user);
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password, rememberMe = true) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);

      localStorage.removeItem('eduretain_token');
      localStorage.removeItem('eduretain_user');
      sessionStorage.removeItem('eduretain_token');
      sessionStorage.removeItem('eduretain_user');

      if (rememberMe) {
        localStorage.setItem('eduretain_token', newToken);
        localStorage.setItem('eduretain_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('eduretain_token', newToken);
        sessionStorage.setItem('eduretain_user', JSON.stringify(userData));
      }

      initSocket(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData, rememberMe = true) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      if (res.data.token && res.data.user) {
        const { token: newToken, user: userData } = res.data;
        setToken(newToken);
        setUser(userData);

        localStorage.removeItem('eduretain_token');
        localStorage.removeItem('eduretain_user');
        sessionStorage.removeItem('eduretain_token');
        sessionStorage.removeItem('eduretain_user');

        if (rememberMe) {
          localStorage.setItem('eduretain_token', newToken);
          localStorage.setItem('eduretain_user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('eduretain_token', newToken);
          sessionStorage.setItem('eduretain_user', JSON.stringify(userData));
        }

        initSocket(userData);
      }
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('eduretain_token');
    localStorage.removeItem('eduretain_user');
    sessionStorage.removeItem('eduretain_token');
    sessionStorage.removeItem('eduretain_user');
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

