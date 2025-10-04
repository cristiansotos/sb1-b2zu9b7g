import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import StoryRecorder from './components/recorder/StoryRecorder';
import StoryDashboard from './components/child/StoryDashboard';
import AddMemoryScreen from './components/child/AddMemoryScreen';
import AdminPanel from './components/admin/AdminPanel';
import BookEditor from './components/book/BookEditor';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando..." />
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const AuthenticatedRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <LoadingSpinner size="lg" message="Inicializando aplicación..." />
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <LoadingSpinner size="lg" message="Inicializando aplicación..." />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <AuthenticatedRedirect>
              <LandingPage />
            </AuthenticatedRedirect>
          } 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/story-recorder/:storyId"
          element={
            <ProtectedRoute>
              <StoryRecorder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/child-dashboard/:storyId"
          element={
            <ProtectedRoute>
              <StoryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-memory/:storyId"
          element={
            <ProtectedRoute>
              <AddMemoryScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-editor/:storyId"
          element={
            <ProtectedRoute>
              <BookEditor />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;