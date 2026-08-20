import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // Or a loading spinner

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
