import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { CircuitProvider } from './hooks/useCircuit';
import LandingPage from './pages/LandingPage';

/**
 * Every route except the landing page is code-split.
 *
 * The landing page is the entry point for anyone arriving at the site, and
 * without this it would download the entire signed-in application first —
 * Three.js and drei alone are most of a megabyte, pulled in eagerly by the
 * Lab's Bloch sphere. Splitting here keeps the hero's first paint to the
 * landing page's own code.
 */
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LabPage = lazy(() => import('./pages/LabPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const Navbar = lazy(() => import('./components/ui/Navbar'));

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="text-quantum-400 text-lg animate-pulse">Loading QuantumIQ...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Public landing page — the site root for signed-in and anonymous
            visitors alike. Its nav points signed-in users at the dashboard. */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Navbar />
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/lab" element={
          <ProtectedRoute>
            <CircuitProvider>
              <Navbar />
              <LabPage />
            </CircuitProvider>
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <CircuitProvider>
              <Navbar />
              <ChallengesPage />
            </CircuitProvider>
          </ProtectedRoute>
        } />

        {/* Unknown paths fall back to the landing page rather than a blank screen. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
