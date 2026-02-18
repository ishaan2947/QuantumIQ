import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Atom } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(email, username, password);
      toast.success('Welcome to QuantumIQ!');
      navigate('/dashboard');
    } catch {
      toast.error('Registration failed — email or username may be taken');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Atom className="w-12 h-12 text-quantum-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-quantum-400 to-quantum-600 bg-clip-text text-transparent">
            QuantumIQ
          </h1>
          <p className="text-gray-400 mt-2">Create your quantum learning account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-quantum-500 focus:ring-1 focus:ring-quantum-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-quantum-500 focus:ring-1 focus:ring-quantum-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-quantum-500 focus:ring-1 focus:ring-quantum-500"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-quantum-600 hover:bg-quantum-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-quantum-400 hover:text-quantum-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
