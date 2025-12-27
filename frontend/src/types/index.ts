// ─── Core Types ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Circuit Types ──────────────────────────────────────────────────────────

export type GateName = 'h' | 'x' | 'y' | 'z' | 'cx' | 'ccx' | 's' | 't';

export interface GateOperation {
  gate: GateName;
  targets: number[];
  step?: number;
}

export interface Circuit {
  id: number;
  name: string;
  description: string | null;
  circuit_data: GateOperation[];
  num_qubits: number;
  share_token: string;
  created_at: string;
  updated_at: string;
}

// ─── Simulation Types ───────────────────────────────────────────────────────

export interface BlochCoords {
  qubit: number;
  x: number;
  y: number;
  z: number;
}

export interface SimulationResult {
  statevector: [number, number][];
  probabilities: Record<string, number>;
  bloch_coords: BlochCoords[];
  measurement_counts: Record<string, number>;
}

export interface StepSimulationResult {
  steps: SimulationResult[];
  gates: GateOperation[];
}

// ─── Chat / Agent Types ─────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCallRecord[];
  challenge?: ChallengeData | null;
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result_preview: string;
}

export interface ChallengeData {
  challenge_id: number;
  name: string;
  description: string;
  num_qubits: number;
  concept: string;
  difficulty: string;
}

// ─── Progress Types ─────────────────────────────────────────────────────────

export interface ProgressEntry {
  concept: string;
  mastery_level: number;
  practice_count: number;
  error_count: number;
  last_practiced: string | null;
}

export interface LearningPlan {
  current_topic: string;
  plan_data: LearningPlanItem[];
  agent_notes: Record<string, unknown>;
  updated_at: string;
}

export interface LearningPlanItem {
  topic: string;
  target_mastery: number;
  completed: boolean;
}

// ─── Challenge Types ────────────────────────────────────────────────────────

export interface PresetChallenge {
  name: string;
  description: string;
  num_qubits: number;
  concepts: string[];
}

export interface ChallengeHistory {
  id: number;
  challenge_name: string;
  description: string | null;
  challenge_type: 'preset' | 'generated';
  target_circuit: GateOperation[] | null;
  completed: boolean;
  score: number | null;
  hints_used: number;
  started_at: string;
  completed_at: string | null;
}

// ─── Gate Metadata ──────────────────────────────────────────────────────────

export interface GateInfo {
  name: string;
  symbol: string;
  description: string;
  qubits: number; // How many qubits this gate acts on
  color: string;
}

export const GATE_CATALOG: Record<GateName, GateInfo> = {
  h: { name: 'Hadamard', symbol: 'H', description: 'Creates superposition', qubits: 1, color: '#5c7cfa' },
  x: { name: 'Pauli-X', symbol: 'X', description: 'Bit flip (NOT gate)', qubits: 1, color: '#ff6b6b' },
  y: { name: 'Pauli-Y', symbol: 'Y', description: 'Bit+phase flip', qubits: 1, color: '#51cf66' },
  z: { name: 'Pauli-Z', symbol: 'Z', description: 'Phase flip', qubits: 1, color: '#ffd43b' },
  cx: { name: 'CNOT', symbol: 'CX', description: 'Controlled NOT', qubits: 2, color: '#845ef7' },
  ccx: { name: 'Toffoli', symbol: 'CCX', description: 'Controlled-controlled NOT', qubits: 3, color: '#f783ac' },
  s: { name: 'S Gate', symbol: 'S', description: 'π/2 phase shift', qubits: 1, color: '#20c997' },
  t: { name: 'T Gate', symbol: 'T', description: 'π/4 phase shift', qubits: 1, color: '#fd7e14' },
};
