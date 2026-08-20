import React from 'react';

export default function ProtectedRoute({ children }) {
  // Auth bypass for development — remove this when backend is ready
  return children;
}
