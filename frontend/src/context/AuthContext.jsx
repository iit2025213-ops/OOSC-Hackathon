import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('adhikaar_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Decode JWT payload to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, email: payload.email, name: payload.name || 'User' });
      } catch {
        localStorage.removeItem('adhikaar_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    const jwt = data.session.access_token;
    localStorage.setItem('adhikaar_token', jwt);
    setToken(jwt);
    return data;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Signup failed');
    }
    // We auto-login after signup by calling the login function
    return await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('adhikaar_token');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    return fetch(url.startsWith('http') ? url : `${API_BASE}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, authFetch, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
