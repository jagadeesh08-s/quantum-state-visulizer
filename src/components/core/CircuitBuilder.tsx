import React, { useState, useCallback } from 'react';
// Removed motion imports to disable animations
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Minus, Settings, RotateCcw, Zap, Cloud, Loader2 } from 'lucide-react';
import { QuantumGateBlock, QUANTUM_GATES, type GateProps } from './QuantumGate';
import StateInputPanel from './StateInputPanel';
import { KetState, KetStateParser, Complex } from '@/utils/quantum/ketState';
import BlochSphere3D from './BlochSphere';
import CircuitAnalysis from './CircuitAnalysis';
import { simulateCircuit, computeGateOutputState } from '@/utils/quantum/quantumSimulation';
import type { QuantumGate } from '@/utils/quantum/circuitOperations';
import { toast } from 'sonner';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { IBMQuantumConnection } from '../tools/IBMQuantumConnection';

// Utility function to generate computational basis states for n qubits
const generateComputationalBasisStates = (numQubits: number): Array<{ label: string; value: string; notation: 'bra-ket' }> => {
  if (numQubits <= 0) return [];

  const states: Array<{ label: string; value: string; notation: 'bra-ket' }> = [];
  const numStates = 1 << numQubits; // 2^numQubits

  for (let i = 0; i < numStates; i++) {
    const binaryString = i.toString(2).padStart(numQubits, '0');
    const label = `|${binaryString}⟩`;
    const value = `|${binaryString}⟩`;
    states.push({ label, value, notation: 'bra-ket' });
  }

  return states;
};

interface GateInputState {
  notation: 'bra-ket' | 'vector' | 'polar';
  value: string | number[] | { magnitude: number; phase: number }[];
  parsed: Complex[];
  isValid: boolean;
}

interface CircuitGate {
  id: string;
  gate: GateProps;
  qubits: number[];
  position: number;
  inputState: GateInputState;
  outputState?: KetState;
}

// Helper function to convert KetState to string format for computeGateOutputState
const ketStateToString = (ketState: KetState | undefined): string => {
  if (!ketState) return '|0⟩';
  return typeof ketState.value === 'string' ? ketState.value : JSON.stringify(ketState.value);
};

interface CircuitData {
  numQubits: number;
  gates: Array<{
    name: string;
    qubits: number[];
    parameters?: { [key: string]: number };
  }>;
}

interface CircuitBuilderProps {
  onCircuitChange: (circuit: CircuitData, ketStates?: string[]) => void;
  onKetStatesChange?: (ketStates: string[]) => void;
  numQubits: number;
  onQubitCountChange: (count: number) => void;
  initialCircuit?: CircuitData; // Circuit to load initially
}

export const CircuitBuilder: React.FC<CircuitBuilderProps> = React.memo(({
  onCircuitChange,
  onKetStatesChange,
  numQubits,
  onQubitCountChange,
  initialCircuit
}) => {
  const [circuitGates, setCircuitGates] = useState<CircuitGate[]>([]);
  const [draggedGate, setDraggedGate] = useState<GateProps | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [gateInputState, setGateInputState] = useState<GateInputState | null>(null);
  const [gateOutputState, setGateOutputState] = useState<KetState | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [activeGateTab, setActiveGateTab] = useState<'single' | 'double' | 'triple'>('single');
  // Per-qubit initial ket state selectors - start with |0⟩ for all qubits
  const defaultKetStates = Array(numQubits).fill('|0⟩');
  const [initialKetStates, setInitialKetStates] = useState<string[]>(defaultKetStates);

  const { isAuthenticated, submitJob, isLoading: isIBMLoading, currentJob } = useIBMQuantum();
  const [isIBMDialogOpen, setIsIBMDialogOpen] = useState(false);

  const handleRunOnIBM = async () => {
    if (!isAuthenticated) {
      setIsIBMDialogOpen(true);
      return;
    }

    const circuitData = {
      numQubits,
      gates: circuitGates.map(g => ({
        name: g.gate.name,
        qubits: g.qubits,
        parameters: g.gate.parameters ? Object.values(g.gate.parameters) : undefined
      }))
    };

    await submitJob(circuitData);
  };


  // Function to recompute all gate states based on circuit flow
  const recomputeGateStates = useCallback((gates: CircuitGate[]): CircuitGate[] => {
    if (gates.length === 0) return gates;

    // Validate inputs
    if (!Array.isArray(gates) || !Array.isArray(initialKetStates)) {
      console.warn('Invalid inputs to recomputeGateStates');
      return gates;
    }

    const updatedGates = [...gates];

    // Track the current state of each qubit as we apply gates sequentially
    const currentQubitStates = [...initialKetStates];

    // Sort gates by their position to ensure correct sequential application
    const sortedGates = updatedGates.sort((a, b) => a.position - b.position);

    sortedGates.forEach(gate => {
      // Determine input state based on current qubit states
      let inputState = '|0⟩';

      if (gate.qubits.length === 1) {
        // Single-qubit gate - use current state of the qubit
        const qubitIndex = gate.qubits[0];
        inputState = currentQubitStates[qubitIndex] || '|0⟩';
      } else if (gate.qubits.length === 2) {
        // Two-qubit gate - combine current states of both qubits
        const [q0, q1] = gate.qubits;
        const state0 = currentQubitStates[q0] || '|0⟩';
        const state1 = currentQubitStates[q1] || '|0⟩';

        // Extract single-qubit state strings and combine
        const s0 = state0.replace(/^\|(.)\⟩$/, '$1');
        const s1 = state1.replace(/^\|(.)\⟩$/, '$1');
        inputState = `|${s0}${s1}⟩`;
      } else if (gate.qubits.length === 3) {
        // Three-qubit gate - combine all three qubits
        const [q0, q1, q2] = gate.qubits;
        const state0 = currentQubitStates[q0] || '|0⟩';
        const state1 = currentQubitStates[q1] || '|0⟩';
        const state2 = currentQubitStates[q2] || '|0⟩';

        const s0 = state0.replace(/^\|(.)\⟩$/, '$1');
        const s1 = state1.replace(/^\|(.)\⟩$/, '$1');
        const s2 = state2.replace(/^\|(.)\⟩$/, '$1');
        inputState = `|${s0}${s1}${s2}⟩`;
      }

      // Set input state for this gate
      gate.inputState = {
        notation: 'bra-ket',
        value: inputState,
        parsed: [],
        isValid: true
      };

      // Compute output state - convert GateProps to QuantumGate format
      try {
        const quantumGate = {
          name: gate.gate.name,
          qubits: gate.qubits,
          parameters: gate.gate.parameters,
          matrix: undefined // Matrix will be looked up from GATES
        } as QuantumGate;
        const inputStateString = ketStateToString(gate.inputState?.value ? { notation: gate.inputState.notation, value: gate.inputState.value } : undefined);
        const outputState = computeGateOutputState(quantumGate, inputStateString, numQubits);

        gate.outputState = outputState;

        // Update current qubit states for next gates
        if (typeof outputState === 'string' && outputState.startsWith('|') && outputState.endsWith('⟩')) {
          const content = outputState.slice(1, -1);

          if (gate.qubits.length === 1) {
            currentQubitStates[gate.qubits[0]] = outputState;
          } else if (content.length === gate.qubits.length) {
            // Try to split separable states (e.g. |01⟩ -> |0⟩, |1⟩)
            const chars = content.split('');
            gate.qubits.forEach((q, idx) => {
              const char = chars[idx];
              if (['0', '1', '+', '-'].includes(char)) {
                currentQubitStates[q] = `|${char}⟩`;
              } else {
                currentQubitStates[q] = 'Entangled';
              }
            });
          } else {
            // Complex/Entangled state string (e.g. |Φ+⟩ or "Entangled")
            gate.qubits.forEach(q => currentQubitStates[q] = 'Entangled');
          }
        }
      } catch (error) {
        console.warn(`Failed to compute output state for gate ${gate.gate.name}:`, error);
        gate.outputState = undefined; // Fallback to undefined
      }
    });

    return updatedGates;
  }, [numQubits, initialKetStates]);

  // Update ket states if qubit count changes
  React.useEffect(() => {
    setInitialKetStates(Array(numQubits).fill('|0⟩'));
  }, [numQubits]);


  // Effect to recompute gates when initial ket states or qubit count changes
  React.useEffect(() => {
    setCircuitGates(prevGates => {
      if (prevGates.length === 0) return prevGates;
      const updatedGates = recomputeGateStates(prevGates);
      // Simple equality check to avoid unnecessary updates
      if (JSON.stringify(updatedGates) === JSON.stringify(prevGates)) return prevGates;
      return updatedGates;
    });
  }, [initialKetStates, numQubits, recomputeGateStates]);

  // Notify parent of changes whenever circuitGates updates
  // We use a ref to track the last notified value to avoid loops if parent passes back the same circuit
  const lastNotifiedCircuit = React.useRef<string>('');

  React.useEffect(() => {
    const circuitState = {
      numQubits,
      gates: circuitGates.map(g => ({
        name: g.gate.name,
        qubits: g.qubits,
        parameters: g.gate.parameters
      }))
    };

    // Create a canonical string representation for comparison
    const circuitString = JSON.stringify({ circuit: circuitState, ketStates: initialKetStates });

    if (lastNotifiedCircuit.current !== circuitString) {
      lastNotifiedCircuit.current = circuitString;
      onCircuitChange(circuitState, initialKetStates);
    }
  }, [circuitGates, initialKetStates, numQubits, onCircuitChange]);

  const handleDragStart = useCallback((gate: GateProps) => {
    setDraggedGate(gate);
  }, []);


  // Load initial circuit when it changes
  React.useEffect(() => {
    if (initialCircuit && initialCircuit.gates) {
      // Deep compare to see if we actually need to update
      const currentCircuitData = {
        numQubits,
        gates: circuitGates.map(g => ({
          name: g.gate.name,
          qubits: g.qubits,
          parameters: g.gate.parameters
        }))
      };

      // Careful: initialCircuit might not have parameters normalized, so comparison might be tricky.
      // But we should try to avoid update if they look the same.
      if (JSON.stringify(initialCircuit) === JSON.stringify(currentCircuitData)) {
        return;
      }

      // Convert the circuit gates to CircuitGate format
      const loadedGates: CircuitGate[] = initialCircuit.gates.map((gate: CircuitData['gates'][0], index: number) => {
        const gateDef = QUANTUM_GATES.find(g => g.name === gate.name);
        if (!gateDef) return null;

        return {
          id: `loaded_gate_${index}_${Date.now()}`,
          gate: { ...gateDef, parameters: gate.parameters || gateDef.parameters },
          qubits: gate.qubits,
          position: gate.qubits[0] || 0,
          inputState: { notation: 'bra-ket' as const, value: '|0⟩', parsed: [], isValid: true },
          outputState: undefined
        };
      }).filter((gate): gate is NonNullable<typeof gate> => gate !== null);

      // Recompute gate states for the loaded circuit
      const gatesWithStates = recomputeGateStates(loadedGates);

      // Update state only if different
      setCircuitGates(gatesWithStates);

      // Update last notified to prevent immediate echo back
      const circuitString = JSON.stringify({
        circuit: {
          numQubits: initialCircuit.numQubits,
          gates: initialCircuit.gates
        },
        ketStates: initialKetStates
      });
      lastNotifiedCircuit.current = circuitString;
    }
  }, [initialCircuit, recomputeGateStates, numQubits, circuitGates, initialKetStates]);

  const handleDrop = useCallback((qubitIndex: number) => {
    if (!draggedGate) return;

    let qubits: number[] = [];

    if (draggedGate.type === 'single') {
      qubits = [qubitIndex];
    } else {
      // For two-qubit gates, use the dropped qubit as control and next as target
      if (qubitIndex < numQubits - 1) {
        qubits = [qubitIndex, qubitIndex + 1];
      } else {
        // Removed toast notification to prevent UI flickering
        return;
      }
    }

    // Initialize parameters for gates that support them
    const gateParameters = draggedGate.parameters ? Object.values(draggedGate.parameters) : undefined;

    const newGate: CircuitGate = {
      id: `gate_${Date.now()}_${Math.random()}`,
      gate: draggedGate,
      qubits,
      position: qubitIndex,
      inputState: { notation: 'bra-ket', value: '|0⟩', parsed: [], isValid: true },
      outputState: undefined
    };

    const newCircuitGates = [...circuitGates, newGate];
    const updatedGates = recomputeGateStates(newCircuitGates);

    setCircuitGates(updatedGates);
    setDraggedGate(null);

    // Update circuit
    const newCircuit = {
      numQubits,
      gates: updatedGates.map(g => ({
        name: g.gate.name,
        qubits: g.qubits,
        parameters: g.gate.parameters
      }))
    };

    onCircuitChange(newCircuit, initialKetStates);
    // Removed toast notification to prevent UI flickering
  }, [draggedGate, numQubits, circuitGates, onCircuitChange, recomputeGateStates, initialKetStates]);

  const removeGate = useCallback((gateId: string) => {
    setCircuitGates(prev => {
      const updated = prev.filter(g => g.id !== gateId);
      const recomputedGates = recomputeGateStates(updated);
      const newCircuit = {
        numQubits,
        gates: recomputedGates.map(g => ({
          name: g.gate.name,
          qubits: g.qubits,
          parameters: g.gate.parameters
        }))
      };
      onCircuitChange(newCircuit, initialKetStates);
      return recomputedGates;
    });
    // Removed toast notification to prevent UI flickering
  }, [numQubits, onCircuitChange, recomputeGateStates, initialKetStates]);

  const clearCircuit = useCallback(() => {
    setCircuitGates([]);
    onCircuitChange({ numQubits, gates: [] }, initialKetStates);
    // Removed toast notification to prevent UI flickering
  }, [numQubits, onCircuitChange, initialKetStates]);

  const selectGate = useCallback((gateId: string) => {
    setSelectedGateId(gateId);
    const gate = circuitGates.find(g => g.id === gateId);
    if (gate) {
      setGateInputState(gate.inputState || null);
      setGateOutputState(gate.outputState || null);
    }
    setIsConfigDialogOpen(true);
  }, [circuitGates]);

  const updateGateStates = useCallback((inputState: GateInputState | null, outputState: KetState | null) => {
    if (!selectedGateId) return;

    setCircuitGates(prev => {
      const updated = prev.map(gate =>
        gate.id === selectedGateId
          ? { ...gate, inputState: inputState || { notation: 'bra-ket', value: '|0⟩', parsed: [], isValid: true }, outputState: outputState || undefined }
          : gate
      );
      return recomputeGateStates(updated);
    });

    // Update circuit with recomputed states
    const updatedGates = circuitGates.map(gate =>
      gate.id === selectedGateId
        ? { ...gate, inputState: inputState || { notation: 'bra-ket', value: '|0⟩', parsed: [], isValid: true }, outputState: outputState || undefined }
        : gate
    );
    const recomputedGates = recomputeGateStates(updatedGates);

    const updatedCircuit = {
      numQubits,
      gates: recomputedGates.map(g => ({
        name: g.gate.name,
        qubits: g.qubits,
        parameters: g.gate.parameters
      }))
    };

    onCircuitChange(updatedCircuit, initialKetStates);
  }, [selectedGateId, numQubits, circuitGates, onCircuitChange, recomputeGateStates]);

  const handleInputStateChange = useCallback((state: KetState | null) => {
    if (state) {
      const gateInputState: GateInputState = {
        notation: state.notation,
        value: typeof state.value === 'string' ? state.value : JSON.stringify(state.value),
        parsed: [], // Will be populated by parser
        isValid: true
      };
      setGateInputState(gateInputState);
      updateGateStates(gateInputState, gateOutputState);
    } else {
      setGateInputState(null);
      updateGateStates(null, gateOutputState);
    }
  }, [gateOutputState, updateGateStates]);

  const handleOutputStateChange = useCallback((state: KetState | null) => {
    setGateOutputState(state);
    updateGateStates(gateInputState, state);
  }, [gateInputState, updateGateStates]);



  // Drag-and-drop gate placement
  const [draggedGateType, setDraggedGateType] = useState<string | null>(null);
  const [dragOverQubit, setDragOverQubit] = useState<number | null>(null);

  // Handle drag start from palette
  const handleGateDragStart = (gateName: string) => {
    setDraggedGateType(gateName);
  };

  // Handle drag over qubit wire
  const handleWireDragOver = (qubitIdx: number) => {
    setDragOverQubit(qubitIdx);
  };

  // Handle drop on qubit wire
  const handleWireDrop = (qubitIdx: number) => {
    if (!draggedGateType) return;
    const gateDef = QUANTUM_GATES.find(g => g.name === draggedGateType);
    if (!gateDef) return; // Removed toast notification to prevent UI flickering

    let qubits: number[] = [];

    // Determine qubits based on gate type
    if (gateDef.type === 'single') {
      qubits = [qubitIdx];
    } else if (gateDef.type === 'double') {
      // Two-qubit gate
      if (qubitIdx < numQubits - 1) {
        qubits = [qubitIdx, qubitIdx + 1];
      } else {
        // Removed toast notification to prevent UI flickering
        return;
      }
    } else if (gateDef.type === 'triple') {
      // Three-qubit gate
      if (qubitIdx < numQubits - 2) {
        qubits = [qubitIdx, qubitIdx + 1, qubitIdx + 2];
      } else {
        // Removed toast notification to prevent UI flickering
        return;
      }
    } else {
      qubits = [qubitIdx]; // Default fallback
    }

    const parameters = gateDef.parameters ? { ...gateDef.parameters } : undefined;
    const newGate: CircuitGate = {
      id: `gate_${Date.now()}_${Math.random()}`,
      gate: { ...gateDef, parameters },
      qubits,
      position: qubitIdx,
      inputState: { notation: 'bra-ket', value: initialKetStates[qubitIdx], parsed: [], isValid: true },
      outputState: undefined
    };
    const newCircuitGates = [...circuitGates, newGate];
    const updatedGates = recomputeGateStates(newCircuitGates);
    setCircuitGates(updatedGates);
    setDraggedGateType(null);
    setDragOverQubit(null);
    const newCircuit = {
      numQubits,
      gates: updatedGates.map(g => ({
        name: g.gate.name,
        qubits: g.qubits,
        parameters: g.gate.parameters
      }))
    };
    onCircuitChange(newCircuit, initialKetStates);
    // Removed toast notification to prevent UI flickering
  };

  return (
    <> {/* Wrap in Fragment for Dialog */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[800px]" role="region" aria-labelledby="circuit-builder-heading">
        {/* Left Palette */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Quantum Gates Palette
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeGateTab} onValueChange={(value) => setActiveGateTab(value as 'single' | 'double' | 'triple')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="single">Single Qubit</TabsTrigger>
                  <TabsTrigger value="double">Two Qubit</TabsTrigger>
                  <TabsTrigger value="triple">Three Qubit</TabsTrigger>
                </TabsList>
                <TabsContent value="single" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {QUANTUM_GATES.filter(gate => gate.type === 'single').map(gate => (
                      <QuantumGateBlock
                        key={gate.name}
                        gate={gate}
                        onDragStart={() => handleGateDragStart(gate.name)}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="double" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {QUANTUM_GATES.filter(gate => gate.type === 'double').map(gate => (
                      <QuantumGateBlock
                        key={gate.name}
                        gate={gate}
                        onDragStart={() => handleGateDragStart(gate.name)}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="triple" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {QUANTUM_GATES.filter(gate => gate.type === 'triple').map(gate => (
                      <QuantumGateBlock
                        key={gate.name}
                        gate={gate}
                        onDragStart={() => handleGateDragStart(gate.name)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>


        </div>

        {/* Circuit Canvas - right side */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Circuit Canvas
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Qubits: {numQubits}</span>

                  {/* IBM Quantum Button (REMOVED) */}


                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQubitCountChange(numQubits + 1)}
                    className="h-8 w-8 p-0"
                    title="Add qubit"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => numQubits > 1 && onQubitCountChange(numQubits - 1)}
                    disabled={numQubits <= 1}
                    className="h-8 w-8 p-0"
                    title="Remove qubit"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCircuit}
                    disabled={circuitGates.length === 0}
                    className="h-8 px-3"
                    title="Reset circuit"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRunOnIBM}
                    disabled={isIBMLoading || circuitGates.length === 0}
                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/50 shadow-sm transition-all"
                    title="Run on IBM Quantum Hardware"
                  >
                    {isIBMLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 mr-1.5 fill-indigo-200" />
                    )}
                    Run on IBM
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Individual Qubit Initial State Selectors - Adaptive based on gate type */}
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-sm font-medium text-primary mb-2">
                  Initial Qubit States {activeGateTab === 'single' ? '(Single Qubit)' : activeGateTab === 'double' ? '(Two Qubit)' : '(Three Qubit)'}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({ length: numQubits }).map((_, qubitIndex) => {
                    // Generate different state options based on active tab
                    const getStateOptions = () => {
                      const baseStates = [
                        { label: '|0⟩', value: '|0⟩' },
                        { label: '|1⟩', value: '|1⟩' }
                      ];

                      if (activeGateTab === 'single') {
                        // Single qubit gates - add superposition states
                        return [
                          ...baseStates,
                          { label: '|+⟩', value: '|+⟩' },
                          { label: '|-⟩', value: '|-⟩' },
                          { label: '|+i⟩', value: '|+i⟩' },
                          { label: '|-i⟩', value: '|-i⟩' }
                        ];
                      } else if (activeGateTab === 'double') {
                        // Two qubit gates - add Bell states for relevant qubits
                        if (qubitIndex <= numQubits - 2) {
                          return [
                            ...baseStates,
                            { label: '|00⟩', value: '|00⟩' },
                            { label: '|01⟩', value: '|01⟩' },
                            { label: '|10⟩', value: '|10⟩' },
                            { label: '|11⟩', value: '|11⟩' },
                            { label: '|+⟩|+⟩', value: '|++⟩' },
                            { label: '|-⟩|-⟩', value: '|--⟩' }
                          ];
                        }
                        return baseStates;
                      } else {
                        // Three qubit gates - add GHZ states and computational basis states for relevant qubits
                        if (qubitIndex <= numQubits - 3) {
                          return [
                            ...baseStates,
                            { label: '|000⟩', value: '|000⟩' },
                            { label: '|001⟩', value: '|001⟩' },
                            { label: '|010⟩', value: '|010⟩' },
                            { label: '|011⟩', value: '|011⟩' },
                            { label: '|100⟩', value: '|100⟩' },
                            { label: '|101⟩', value: '|101⟩' },
                            { label: '|110⟩', value: '|110⟩' },
                            { label: '|111⟩', value: '|111⟩' },
                            { label: '|+++⟩', value: '|+++⟩' },
                            { label: '|---⟩', value: '|---⟩' }
                          ];
                        }
                        return baseStates;
                      }
                    };

                    const stateOptions = getStateOptions();

                    return (
                      <div key={qubitIndex} className="flex items-center gap-2">
                        <span className="text-xs text-primary font-mono min-w-0">Q{qubitIndex}:</span>
                        <select
                          className="flex-1 px-2 py-1 rounded border border-primary/30 bg-background text-xs font-mono text-primary"
                          value={initialKetStates[qubitIndex]}
                          title={`Select initial state for qubit ${qubitIndex} (${activeGateTab === 'single' ? 'single' : activeGateTab === 'double' ? 'two' : 'three'} qubit gate mode)`}
                          onChange={e => {
                            const newStates = [...initialKetStates];
                            newStates[qubitIndex] = e.target.value;
                            setInitialKetStates(newStates);
                            // Notify parent component of ket state change
                            if (onKetStatesChange) {
                              onKetStatesChange(newStates);
                            }
                          }}
                        >
                          {stateOptions.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drag and Drop Instructions */}
              {draggedGateType && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
                  <span className="text-sm text-primary font-medium">
                    Dragging: {draggedGateType} gate - Drop on a qubit line below
                  </span>
                </div>
              )}

              {/* Qubit Wires - Horizontally Scrollable Container */}
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto border-2 border-dashed border-gray-700/30 rounded-lg p-4 bg-gray-800/5 relative circuit-scrollbar hover:border-primary/50 transition-colors">
                <div className="flex flex-col gap-4">
                  {Array.from({ length: numQubits }).map((_, qubitIndex) => (
                    <div
                      key={qubitIndex}
                      className={`flex items-center gap-2 min-h-[60px] p-2 rounded-lg transition-all duration-200 ${dragOverQubit === qubitIndex ? 'bg-primary/20 border-2 border-primary border-dashed scale-[1.02]' : 'hover:bg-primary/5'
                        }`}
                      onDragOver={e => { e.preventDefault(); handleWireDragOver(qubitIndex); }}
                      onDrop={e => { e.preventDefault(); handleWireDrop(qubitIndex); }}
                      onDragLeave={() => setDragOverQubit(null)}
                    >
                      {/* Qubit wire label */}
                      <span className="font-mono text-xs text-muted-foreground mr-2 min-w-20">Qubit {qubitIndex}</span>

                      {/* Drop zone indicator */}
                      <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0">
                        {dragOverQubit === qubitIndex && (
                          <div className="flex items-center gap-1 text-primary animate-pulse">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="text-xs font-medium">Drop gate here</span>
                          </div>
                        )}
                        {/* Render gates for this qubit inline */}
                        {circuitGates
                          .filter(gate => gate.qubits.includes(qubitIndex))
                          .sort((a, b) => a.position - b.position)
                          .map((gate, idx) => {
                            // Get the computed input state for this gate
                            let inputState = '|0⟩';
                            if (gate.inputState && gate.inputState.value) {
                              inputState = typeof gate.inputState.value === 'string'
                                ? gate.inputState.value
                                : String(gate.inputState.value);
                            }

                            // Get the computed output state for this gate
                            let outputState = '—';
                            if (gate.outputState) {
                              outputState = typeof gate.outputState === 'string'
                                ? gate.outputState
                                : 'Complex State';
                            }

                            return (
                              <div key={gate.id} className="flex items-center gap-1 flex-shrink-0 min-w-0">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-muted-foreground">In</span>
                                  <div className="bg-primary/10 border border-primary/20 rounded px-2 py-1 min-w-16">
                                    <div className="text-xs font-mono text-center text-primary">
                                      {inputState}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={`
                                  relative flex items-center justify-center w-10 h-10
                                  ${gate.gate.color} rounded text-white font-bold text-sm
                                  cursor-pointer hover:opacity-80 transition-opacity
                                  ${selectedGateId === gate.id ? 'ring-2 ring-accent' : ''}
                                `}
                                  onClick={() => selectGate(gate.id)}
                                  title={`Click to configure ${gate.gate.name} gate`}
                                  role="button"
                                  aria-label={`${gate.gate.name} gate applied to qubit${gate.qubits.length > 1 ? 's' : ''} ${gate.qubits.join(' and ')}. Input state: ${inputState}, Output state: ${outputState}. ${gate.gate.description}`}
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      selectGate(gate.id);
                                    }
                                  }}
                                >
                                  {gate.gate.symbol}
                                  {gate.gate.type === 'double' && gate.qubits[0] === qubitIndex && (
                                    <div className="absolute top-full w-px h-12 bg-primary/60" />
                                  )}
                                  {gate.gate.type === 'triple' && gate.qubits[0] === qubitIndex && (
                                    <div className="absolute top-full w-px h-24 bg-primary/60" />
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-muted-foreground">Out</span>
                                  <div className="bg-accent/10 border border-accent/20 rounded px-2 py-1 min-w-16">
                                    <div className="text-xs font-mono text-center text-accent">
                                      {outputState}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Circuit Summary - Outside scrollable area */}
              {circuitGates.length > 0 && (
                <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                  <div className="text-sm font-medium mb-2">Circuit Gates:</div>
                  <div className="flex flex-wrap gap-2">
                    {circuitGates.map(gate => (
                      <Badge key={gate.id} variant="secondary" className="text-xs">
                        {gate.gate.name}({gate.qubits.join(',')})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Gate Configuration Dialog */}
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gate Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {selectedGateId && (() => {
                  const selectedGate = circuitGates.find(g => g.id === selectedGateId);
                  if (!selectedGate) return null;

                  return (
                    <div className="space-y-6">
                      {/* Gate Info */}
                      <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg">
                        <div className={`
                        w-12 h-12 rounded-md ${selectedGate.gate.color}
                        flex items-center justify-center text-white font-bold text-lg
                      `}>
                          {selectedGate.gate.symbol}
                        </div>
                        <div>
                          <h3 className="font-semibold">{selectedGate.gate.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedGate.gate.description}</p>
                          <p className="text-xs text-accent">Target qubits: {selectedGate.qubits.join(', ')}</p>
                        </div>
                      </div>

                      {/* Output State Preview - Moved to Top */}
                      {selectedGate.outputState && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Output Result</h4>
                            <Badge variant="outline" className="text-base px-3 py-1 bg-primary/10 border-primary/30 text-primary font-mono">
                              {typeof selectedGate.outputState === 'string' ? selectedGate.outputState : 'Complex State'}
                            </Badge>
                          </div>

                          {/* Compute robust output vector for Bloch sphere */}
                          {(() => {
                            const quantumGate = {
                              name: selectedGate.gate.name,
                              qubits: selectedGate.qubits,
                              parameters: selectedGate.gate.parameters,
                              matrix: undefined
                            } as QuantumGate;
                            const inputStateString = ketStateToString(selectedGate.inputState?.value ? { notation: selectedGate.inputState.notation, value: selectedGate.inputState.value } : undefined);
                            const outputState = computeGateOutputState(
                              quantumGate,
                              inputStateString,
                              numQubits
                            );

                            let blochVector = { x: 0, y: 0, z: 0 }; // Default to mixed center for Entangled

                            if (typeof outputState === 'string') {
                              if (outputState === '|0⟩' || outputState === '|0>') blochVector = { x: 0, y: 0, z: 1 };
                              else if (outputState === '|1⟩' || outputState === '|1>') blochVector = { x: 0, y: 0, z: -1 };
                              else if (outputState === '|+⟩') blochVector = { x: 1, y: 0, z: 0 };
                              else if (outputState === '|-⟩') blochVector = { x: -1, y: 0, z: 0 };
                              else if (outputState === '|+i⟩') blochVector = { x: 0, y: 1, z: 0 };
                              else if (outputState === '|-i⟩') blochVector = { x: 0, y: -1, z: 0 };
                              else if (outputState.startsWith('[') && outputState.endsWith(']')) {
                                try {
                                  const vectorStr = outputState.slice(1, -1);
                                  const amplitudes = vectorStr.split(',').map(s => parseFloat(s.trim()));
                                  if (amplitudes.length === 2) {
                                    const [a, b] = amplitudes;
                                    blochVector = {
                                      x: 2 * a * b,
                                      y: 0,
                                      z: a * a - b * b
                                    };
                                  }
                                } catch (e) { }
                              }
                            }

                            let highlightedAxis: 'x' | 'y' | 'z' | null = null;
                            const gateName = selectedGate.gate.name;
                            if (['X', 'RX', 'SQRTX'].includes(gateName)) highlightedAxis = 'x';
                            else if (['Y', 'RY', 'SQRTY'].includes(gateName)) highlightedAxis = 'y';
                            else if (['Z', 'RZ', 'SQRTZ', 'S', 'T', 'P'].includes(gateName)) highlightedAxis = 'z';

                            return (
                              <div className="h-64 w-full flex justify-center bg-gray-900/80 border border-border/30 rounded-lg p-3">
                                <div className="relative w-full h-full flex items-center justify-center">
                                  <BlochSphere3D
                                    vector={blochVector}
                                    size={300}
                                    className="w-full h-full"
                                    highlightedAxis={highlightedAxis}
                                  />
                                  <div className="absolute bottom-2 left-2 text-cyan-400 text-xs font-mono space-y-1 pointer-events-none bg-black/40 p-1 rounded backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-0.5 bg-cyan-400"></div>
                                      <span>Output Vector</span>
                                    </div>
                                    {highlightedAxis && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-0.5 bg-yellow-400"></div>
                                        <span>Rotation Axis ({highlightedAxis.toUpperCase()})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Gate Parameters */}
                      {selectedGate.gate.parameters && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Gate Parameters</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(selectedGate.gate.parameters).map(([param, value]) => (
                              <div key={param}>
                                <label className="block text-sm font-medium mb-2 capitalize">{param}</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={value}
                                  onChange={(e) => {
                                    const newVal = parseFloat(e.target.value);
                                    if (!isNaN(newVal)) {
                                      setCircuitGates(prev => prev.map(gate =>
                                        gate.id === selectedGateId
                                          ? {
                                            ...gate,
                                            gate: {
                                              ...gate.gate,
                                              parameters: { ...gate.gate.parameters, [param]: newVal }
                                            }
                                          }
                                          : gate
                                      ));
                                    }
                                  }}
                                  className="w-full"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Input State Configuration */}
                      <div>
                        <h4 className="font-medium mb-4">Input State Configuration</h4>
                        <StateInputPanel
                          onStateChange={handleInputStateChange}
                          initialState={selectedGate.inputState ? {
                            notation: selectedGate.inputState.notation,
                            value: selectedGate.inputState.value
                          } : undefined}
                          title={`Modify Input (Affects this gate only)`}
                          showBlochPreview={false} // Minimized to save space
                          numQubits={numQubits}
                          gateQubitCount={selectedGate.qubits.length}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="col-span-1 lg:col-span-5 mt-6">
          <CircuitAnalysis
            numQubits={numQubits}
            circuitGates={circuitGates.map(g => ({
              name: g.gate.name,
              qubits: g.qubits,
              parameters: g.gate.parameters
            }))}
            ketStates={initialKetStates}
            ibmResults={currentJob?.results}
            ibmStatus={currentJob?.status}
            ibmTimeline={currentJob?.timeline}
          />
        </div>

        <IBMQuantumConnection
          isOpen={isIBMDialogOpen}
          onClose={() => setIsIBMDialogOpen(false)}
        />
      </div>
    </>
  );
});

export default CircuitBuilder;