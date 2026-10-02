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

/**
 * Gates are grouped by what they physically do to the state, and the grouping
 * is what drives their appearance — fill, outline, width and glyph weight,
 * never hue. See DESIGN.md §6.
 *
 *   superposition — H alone. The only gate that takes a basis state somewhere
 *                   a basis state cannot go, so the only filled key.
 *   pauli         — X, Y, Z. A π rotation about one axis.
 *   phase         — S, T. A fraction of π about Z.
 *   entangling    — CX, CCX. Acts on more than one wire, so the key is wider.
 */
export type GateFamily = 'superposition' | 'pauli' | 'phase' | 'entangling';

export interface GateInfo {
  name: string;
  symbol: string;
  description: string;
  /** How many qubits this gate acts on. */
  qubits: number;
  family: GateFamily;
  /** Single-key keyboard shortcut, engraved on the keycap. */
  key: string;
}

export const GATE_CATALOG: Record<GateName, GateInfo> = {
  h: {
    name: 'Hadamard',
    symbol: 'H',
    description: 'Puts a qubit into an equal superposition of |0⟩ and |1⟩',
    qubits: 1,
    family: 'superposition',
    key: 'h',
  },
  x: {
    name: 'Pauli-X',
    symbol: 'X',
    description: 'Bit flip — a π rotation about the X axis',
    qubits: 1,
    family: 'pauli',
    key: 'x',
  },
  y: {
    name: 'Pauli-Y',
    symbol: 'Y',
    description: 'Bit and phase flip — a π rotation about the Y axis',
    qubits: 1,
    family: 'pauli',
    key: 'y',
  },
  z: {
    name: 'Pauli-Z',
    symbol: 'Z',
    description: 'Phase flip — a π rotation about the Z axis',
    qubits: 1,
    family: 'pauli',
    key: 'z',
  },
  s: {
    name: 'S',
    symbol: 'S',
    description: 'Quarter turn about Z — a π/2 phase shift',
    qubits: 1,
    family: 'phase',
    key: 's',
  },
  t: {
    name: 'T',
    symbol: 'T',
    description: 'Eighth turn about Z — a π/4 phase shift',
    qubits: 1,
    family: 'phase',
    key: 't',
  },
  cx: {
    name: 'CNOT',
    symbol: 'CX',
    description: 'Flips the target when the control is |1⟩ — this is what entangles',
    qubits: 2,
    family: 'entangling',
    key: '2',
  },
  ccx: {
    name: 'Toffoli',
    symbol: 'CCX',
    description: 'Flips the target when both controls are |1⟩',
    qubits: 3,
    family: 'entangling',
    key: '3',
  },
};

/** Reverse lookup for the keypad's keyboard shortcuts. */
export const GATE_BY_KEY: Record<string, GateName> = Object.entries(
  GATE_CATALOG,
).reduce<Record<string, GateName>>((acc, [name, info]) => {
  acc[info.key] = name as GateName;
  return acc;
}, {});
