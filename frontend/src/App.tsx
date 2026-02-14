import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { CircuitProvider } from './hooks/useCircuit';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LabPage from './pages/LabPage';
import ChallengesPage from './pages/ChallengesPage';
import Navbar from './components/ui/Navbar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-quantum-400 text-lg animate-pulse">Loading QuantumIQ...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
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
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
