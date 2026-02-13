/**
 * API service layer — centralized HTTP client for all backend communication.
 *
 * Why a service layer: Components should not contain HTTP logic directly.
 * This layer handles auth headers, error formatting, and provides typed
 * methods that components can call without knowing the API structure.
 */

import axios, { AxiosInstance } from 'axios';
import type {
  TokenResponse,
  Circuit,
  SimulationResult,
  StepSimulationResult,
  GateOperation,
  ProgressEntry,
  LearningPlan,
  PresetChallenge,
  ChallengeHistory,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({ baseURL: API_BASE });

    // Attach JWT to every request automatically
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 globally — redirect to login
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Auth ───────────────────────────────────────────────────────────

  async register(email: string, username: string, password: string): Promise<TokenResponse> {
    const { data } = await this.client.post('/auth/register', { email, username, password });
    return data;
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async getMe(): Promise<TokenResponse['user']> {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // ─── Circuits ───────────────────────────────────────────────────────

  async saveCircuit(name: string, circuit_data: GateOperation[], num_qubits: number, description?: string): Promise<Circuit> {
    const { data } = await this.client.post('/circuits/', { name, circuit_data, num_qubits, description });
    return data;
  }

  async listCircuits(): Promise<Circuit[]> {
    const { data } = await this.client.get('/circuits/');
    return data;
  }

  async getCircuit(id: number): Promise<Circuit> {
    const { data } = await this.client.get(`/circuits/${id}`);
    return data;
  }

  async updateCircuit(id: number, updates: Partial<Circuit>): Promise<Circuit> {
    const { data } = await this.client.put(`/circuits/${id}`, updates);
    return data;
  }

  async deleteCircuit(id: number): Promise<void> {
    await this.client.delete(`/circuits/${id}`);
  }

  async getSharedCircuit(token: string): Promise<Circuit> {
    const { data } = await this.client.get(`/circuits/share/${token}`);
    return data;
  }

  // ─── Simulation ─────────────────────────────────────────────────────

  async simulate(circuit_data: GateOperation[], num_qubits: number, shots?: number): Promise<SimulationResult> {
    const { data } = await this.client.post('/simulate/', { circuit_data, num_qubits, shots: shots || 1024 });
    return data;
  }

  async simulateStepByStep(circuit_data: GateOperation[], num_qubits: number): Promise<StepSimulationResult> {
    const { data } = await this.client.post('/simulate/step', { circuit_data, num_qubits });
    return data;
  }

  // ─── Chat / Agent ───────────────────────────────────────────────────

  async chat(
    message: string,
    circuit_data?: GateOperation[],
    num_qubits?: number,
    conversation_history?: Array<{ role: string; content: string }>,
  ): Promise<{
    response: string;
    tool_calls: Array<{ tool: string; args: Record<string, unknown>; result_preview: string }> | null;
    suggested_circuit: GateOperation[] | null;
    challenge: Record<string, unknown> | null;
  }> {
    const { data } = await this.client.post('/chat/', {
      message,
      circuit_data,
      num_qubits,
      conversation_history,
    });
    return data;
  }

  // ─── Progress ───────────────────────────────────────────────────────

  async getProgress(): Promise<ProgressEntry[]> {
    const { data } = await this.client.get('/progress/');
    return data;
  }

  async getLearningPlan(): Promise<LearningPlan> {
    const { data } = await this.client.get('/progress/plan');
    return data;
  }

  // ─── Challenges ─────────────────────────────────────────────────────

  async getPresets(): Promise<Record<string, PresetChallenge>> {
    const { data } = await this.client.get('/challenges/presets');
    return data;
  }

  async startChallenge(challengeName: string): Promise<ChallengeHistory> {
    const { data } = await this.client.post('/challenges/start', { challenge_name: challengeName });
    return data;
  }

  async submitChallenge(challengeId: number, userCircuit: GateOperation[]): Promise<ChallengeHistory> {
    const { data } = await this.client.post('/challenges/submit', { challenge_id: challengeId, user_circuit: userCircuit });
    return data;
  }

  async getChallengeHistory(): Promise<ChallengeHistory[]> {
    const { data } = await this.client.get('/challenges/history');
    return data;
  }
}

export const api = new ApiService();
