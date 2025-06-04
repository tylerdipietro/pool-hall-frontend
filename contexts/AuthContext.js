import React, { createContext, useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in by hitting a backend endpoint
  const checkAuthStatus = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/auth/success`, {
      credentials: 'include', // send cookies/session
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function: redirect browser to backend Google OAuth start URL
  const login = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  // Logout function (optional): you can implement if you have a logout route
  const logout = () => {
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(() => {
        setUser(null);
      })
      .catch(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
