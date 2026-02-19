import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { ProgressEntry, LearningPlan, Circuit } from '../types';
import { FlaskConical, Trophy, BookOpen, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prog, planData, circuitData] = await Promise.all([
          api.getProgress(),
          api.getLearningPlan(),
          api.listCircuits(),
        ]);
        setProgress(prog);
        setPlan(planData);
        setCircuits(circuitData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  const avgMastery = progress.length > 0
    ? progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-quantum-400">{user?.username}</span>
          </h1>
          <p className="text-gray-400 mt-1">Continue your quantum computing journey</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/lab"
            className="bg-gradient-to-br from-quantum-600/20 to-quantum-800/20 border border-quantum-500/30 rounded-xl p-6 hover:border-quantum-400/50 transition-all group"
          >
            <FlaskConical className="w-8 h-8 text-quantum-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white">Quantum Lab</h3>
            <p className="text-gray-400 text-sm mt-1">Build and simulate circuits with AI guidance</p>
          </Link>
          <Link
            to="/challenges"
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all group"
          >
            <Trophy className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white">Challenges</h3>
            <p className="text-gray-400 text-sm mt-1">Test your skills with quantum puzzles</p>
          </Link>
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-6">
            <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="text-lg font-semibold text-white">
              {Math.round(avgMastery * 100)}% Mastery
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {progress.length} concepts tracked · {circuits.length} circuits built
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Plan */}
          <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-quantum-400" />
              <h2 className="text-lg font-semibold text-white">Learning Plan</h2>
            </div>
            {plan?.current_topic && (
              <p className="text-sm text-quantum-300 mb-4">
                Current focus: <span className="font-medium">{plan.current_topic.replace(/_/g, ' ')}</span>
              </p>
            )}
            <div className="space-y-3">
              {(plan?.plan_data || []).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <span className={`text-sm flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                    {item.topic.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    Target: {Math.round(item.target_mastery * 100)}%
                  </span>
                </div>
              ))}
              {(!plan?.plan_data || plan.plan_data.length === 0) && (
                <p className="text-gray-500 text-sm">
                  Start a chat in the Quantum Lab to get your personalized plan!
                </p>
              )}
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Concept Mastery</h2>
            </div>
            <div className="space-y-3">
              {progress.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{p.concept.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-500">{Math.round(p.mastery_level * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#0a0a1a] rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${p.mastery_level * 100}%`,
                        backgroundColor: p.mastery_level > 0.7 ? '#51cf66' : p.mastery_level > 0.4 ? '#ffd43b' : '#ff6b6b',
                      }}
                    />
                  </div>
                </div>
              ))}
              {progress.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No progress yet — head to the Quantum Lab to start learning!
                </p>
              )}
            </div>
          </div>

          {/* Recent Circuits */}
          <div className="bg-[#12122a] rounded-xl border border-[#1a1a3e] p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Circuits</h2>
            {circuits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {circuits.slice(0, 6).map(c => (
                  <div key={c.id} className="bg-[#0a0a1a] rounded-lg border border-[#2a2a4a] p-4">
                    <h3 className="text-sm font-medium text-white truncate">{c.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.circuit_data.length} gates · {c.num_qubits} qubits
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No circuits yet — build your first one in the Lab!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
