import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import GuestPortal from './pages/GuestPortal';
import AuthPortal from './pages/AuthPortal';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import WhatsAppWidget from './components/WhatsAppWidget';
import './index.css';

import SuperAdminDashboard from './pages/SuperAdminDashboard';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// In production (Render), the React app is served from the same Express server,
// so API calls use a relative URL. In development, it points to localhost:5000.
const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
export { API };


// Global 401 interceptor — auto-logout when JWT token expires
const _originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await _originalFetch(...args);
  if (response.status === 401) {
    // Only intercept API calls (not CDN / other resources)
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (url.includes(API)) {
      localStorage.removeItem('alinda_user');
      localStorage.removeItem('alinda_token');
      // Redirect to /auth only if not already there
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }
  }
  return response;
};

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('alinda_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('alinda_token') || null);
  const [theme, setTheme] = useState(() => localStorage.getItem('alinda_theme') || 'dark');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('alinda_user', JSON.stringify(userData));
    localStorage.setItem('alinda_token', userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('alinda_user');
    localStorage.removeItem('alinda_token');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('alinda_theme', newTheme);
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'superadmin': return '/superadmin';
      case 'admin': return '/admin';
      case 'teacher': return '/teacher';
      case 'student': return '/student';
      default: return '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, theme, toggleTheme }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<GuestPortal />} />
          <Route path="/auth" element={
            user ? <Navigate to={getDashboardRoute()} replace /> : <AuthPortal />
          } />
          <Route path="/superadmin/*" element={
            <ProtectedRoute role="superadmin"><SuperAdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/teacher/*" element={
            <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
          } />
          <Route path="/student/*" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <WhatsAppWidget />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
