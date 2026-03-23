import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const { token, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>;
  }

  return token ? <AdminDashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <div style={{ fontFamily: "'AsiaHead', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <AppContent />
      </div>
    </AuthProvider>
  );
}

