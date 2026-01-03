/**
 * Circuit state management hook.
 *
 * Centralizes all circuit state (gates, qubits, simulation results)
 * and provides methods for gate manipulation. This is lifted out of
 * components so the circuit builder, chat panel, and visualization
 * all share the same state without prop drilling.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { GateOperation, GateName, SimulationResult, StepSimulationResult } from '../types';
import { api } from '../services/api';

interface CircuitContextType {
  gates: GateOperation[];
  numQubits: number;
  simulationResult: SimulationResult | null;
  stepResult: StepSimulationResult | null;
  currentStep: number;
  isSimulating: boolean;
  isSteppingThrough: boolean;

  addGate: (gate: GateName, targets: number[]) => void;
  removeGate: (index: number) => void;
  clearCircuit: () => void;
  setNumQubits: (n: number) => void;
  loadCircuit: (gates: GateOperation[], numQubits: number) => void;
  runSimulation: () => Promise<void>;
  runStepThrough: () => Promise<void>;
  setCurrentStep: (step: number) => void;
  playStepThrough: () => void;
  stopStepThrough: () => void;
}

const CircuitContext = createContext<CircuitContextType | null>(null);

export function CircuitProvider({ children }: { children: ReactNode }) {
  const [gates, setGates] = useState<GateOperation[]>([]);
  const [numQubits, setNumQubits] = useState(2);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [stepResult, setStepResult] = useState<StepSimulationResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSteppingThrough, setIsSteppingThrough] = useState(false);
  const [playInterval, setPlayInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const addGate = useCallback((gate: GateName, targets: number[]) => {
    setGates(prev => [...prev, { gate, targets, step: prev.length }]);
    // Auto-simulate on gate add for real-time updates
    setSimulationResult(null);
  }, []);

  const removeGate = useCallback((index: number) => {
    setGates(prev => prev.filter((_, i) => i !== index));
    setSimulationResult(null);
  }, []);

  const clearCircuit = useCallback(() => {
    setGates([]);
    setSimulationResult(null);
    setStepResult(null);
    setCurrentStep(0);
  }, []);

  const loadCircuit = useCallback((newGates: GateOperation[], qubits: number) => {
    setGates(newGates);
    setNumQubits(qubits);
    setSimulationResult(null);
    setStepResult(null);
  }, []);

  const runSimulation = useCallback(async () => {
    if (gates.length === 0) return;
    setIsSimulating(true);
    try {
      const result = await api.simulate(gates, numQubits);
      setSimulationResult(result);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [gates, numQubits]);

  const runStepThrough = useCallback(async () => {
    if (gates.length === 0) return;
    setIsSimulating(true);
    try {
      const result = await api.simulateStepByStep(gates, numQubits);
      setStepResult(result);
      setCurrentStep(0);
    } catch (err) {
      console.error('Step simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [gates, numQubits]);

  const playStepThrough = useCallback(() => {
    if (!stepResult) return;
    setIsSteppingThrough(true);
    setCurrentStep(0);

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= stepResult.steps.length - 1) {
          clearInterval(interval);
          setIsSteppingThrough(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200); // 1.2s per step for smooth animation

    setPlayInterval(interval);
  }, [stepResult]);

  const stopStepThrough = useCallback(() => {
    if (playInterval) {
      clearInterval(playInterval);
      setPlayInterval(null);
    }
    setIsSteppingThrough(false);
  }, [playInterval]);

  return (
    <CircuitContext.Provider value={{
      gates, numQubits, simulationResult, stepResult, currentStep,
      isSimulating, isSteppingThrough,
      addGate, removeGate, clearCircuit, setNumQubits, loadCircuit,
      runSimulation, runStepThrough, setCurrentStep,
      playStepThrough, stopStepThrough,
    }}>
      {children}
    </CircuitContext.Provider>
  );
}

export function useCircuit(): CircuitContextType {
  const context = useContext(CircuitContext);
  if (!context) throw new Error('useCircuit must be used within CircuitProvider');
  return context;
}
