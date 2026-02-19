import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Atom, LayoutDashboard, FlaskConical, Trophy, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/lab', label: 'Quantum Lab', icon: FlaskConical },
    { path: '/challenges', label: 'Challenges', icon: Trophy },
  ];

  return (
    <nav className="bg-[#0d0d20] border-b border-[#1a1a3e] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold">
        <Atom className="w-7 h-7 text-quantum-500" />
        <span className="bg-gradient-to-r from-quantum-400 to-quantum-600 bg-clip-text text-transparent">
          QuantumIQ
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {navLinks.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === path
                ? 'bg-quantum-600/20 text-quantum-300'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {user?.username}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
