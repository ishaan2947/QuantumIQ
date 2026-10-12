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

/**
 * Shown while a code-split route downloads, and while a stored token is being
 * verified. A sweep rather than pulsing text: the instrument is initialising,
 * and a line that fills is a more honest loading signal than a word that fades
 * in and out forever.
 */
function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="relative block h-px w-24 overflow-hidden bg-rule-strong">
          <span className="absolute inset-y-0 w-6 animate-sweep bg-copper-400" />
        </span>
        <span className="font-mono text-micro uppercase text-ink-tertiary">Initialising</span>
      </div>
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
