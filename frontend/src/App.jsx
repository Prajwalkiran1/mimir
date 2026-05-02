import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LandingPage from './pages/LandingPage';
import VideoUpload from './pages/VideoUpload';
import Profile from './pages/Profile';
import RAGSearch from './pages/RAGSearch';

/**
 * Gate that pushes unauthenticated users to /login while remembering where
 * they wanted to go, so the login page can send them back after auth.
 */
const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a1a1a', color: 'rgba(220,248,242,0.6)', fontFamily: 'sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route path="/upload"  element={<RequireAuth><VideoUpload /></RequireAuth>} />
          <Route path="/search"  element={<RequireAuth><RAGSearch /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Root → landing for everyone (auth check happens on /upload click) */}
          <Route path="/"        element={<Navigate to="/landing" replace />} />
          <Route path="*"        element={<Navigate to="/landing" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
