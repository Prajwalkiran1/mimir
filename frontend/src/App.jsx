import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import VideoUpload from './pages/VideoUpload';
import Profile from './pages/Profile';
import RAGSearch from './pages/RAGSearch';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-mimir-white">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<VideoUpload />} />
            <Route path="/search" element={<RAGSearch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;