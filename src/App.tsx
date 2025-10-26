import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';

const StoryRecorder = lazy(() => import('./components/recorder/StoryRecorder'));
const StoryDashboard = lazy(() => import('./components/child/StoryDashboard'));
const AddMemoryScreen = lazy(() => import('./components/child/AddMemoryScreen'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const AcceptInvitationPage = lazy(() => import('./components/invitation/AcceptInvitationPage'));

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
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="Cargando grabadora..." /></div>}>
                <StoryRecorder />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/child-dashboard/:storyId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="Cargando panel..." /></div>}>
                <StoryDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-memory/:storyId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="Cargando memoria..." /></div>}>
                <AddMemoryScreen />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="Cargando panel de administración..." /></div>}>
                <AdminPanel />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accept-invitation"
          element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="Cargando invitación..." /></div>}>
              <AcceptInvitationPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;