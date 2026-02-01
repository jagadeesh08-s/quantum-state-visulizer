import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Play,
  Home,
  Code,
  Palette,
  Zap,
  Earth,
  Cpu,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  CircuitBoard,
  BookOpen,
  BarChart3,
  TrendingUp,
  Microscope,
  Shield,
  Power,
  PowerOff,
  Settings,
  Unlink,
  User,
  LogIn,
  Atom,
  Network,
  Brain,
  Gamepad2,
  MessageCircle,
  Target,
  Activity,
} from 'lucide-react';
import Loading from '@/components/ui/loading';
import { useTheme } from '@/components/general/ThemeProvider';
import { themeLayouts } from '@/config/themeLayouts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BlochSphere3D from '@/components/core/BlochSphere';
import CircuitBuilder from '@/components/core/CircuitBuilder';
import ThemeToggle from '@/components/general/ThemeToggle';
import CompactCache from '@/components/general/CompactCache';
import FloatingAI from '@/components/general/FloatingAI';
import CodeEditor from '@/components/tools/CodeEditor';
import EntanglementAnalysis from '@/components/advanced/EntanglementAnalysis';
import CircuitDiagram from '@/components/core/CircuitDiagram';
import StateSelectorWidget from '@/components/core/StateSelectorWidget';
import AdvancedVisualization from '@/components/advanced/AdvancedVisualization';
import QuantumAnalytics from '@/components/advanced/QuantumAnalytics';
import CacheManager from '@/components/tools/CacheManager';
import QuantumApplications from '@/components/tools/QuantumApplications';
import BlochSphereModal from '@/components/modals/BlochSphereModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { IBMQuantumConnection } from '@/components/tools/IBMQuantumConnection';

import { Suspense, lazy } from 'react';

// Lazy load heavy components for better performance
const VQEPlayground = lazy(() => import('@/components/advanced/VQEPlayground').then(module => ({ default: module.VQEPlayground })));
const NoiseSimulator = lazy(() => import('@/components/advanced/NoiseSimulator').then(module => ({ default: module.NoiseSimulator })));
const AITutor = lazy(() => import('@/components/advanced/AITutor').then(module => ({ default: module.AITutor })));
const GamificationSystem = lazy(() => import('@/components/advanced/GamificationSystem').then(module => ({ default: module.GamificationSystem })));
const AdvancedAnalytics = lazy(() => import('@/components/advanced/AdvancedAnalytics').then(module => ({ default: module.AdvancedAnalytics })));
const QuantumMedicalImaging = lazy(() => import('@/components/advanced/QuantumMedicalImaging').then(module => ({ default: module.default })));
import { useAnalytics } from '@/hooks/useAnalytics';
import { type QuantumState } from '@/utils/core/stateNotationConverter';
import {
  simulateCircuit,
  simulateCircuitWithStates,
  EXAMPLE_CIRCUITS,
  AVAILABLE_GATES,
  SINGLE_QUBIT_GATES,
  TWO_QUBIT_GATES,
  formatDensityMatrix,
  testGateOutputs,
  computeGateOutputState,
  type QuantumCircuit,
  type DensityMatrix
} from '@/utils/quantum/quantumSimulation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Global spacing constants for consistent UI design
const SPACING_SCALE = {
  xs: 2, // 0.5rem - Tight spacing within components
  sm: 3, // 0.75rem - Small component gaps
  md: 4, // 1rem - Standard component spacing
  lg: 6, // 1.5rem - Section spacing
  xl: 8, // 2rem - Major section dividers
};

const Workspace: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const layout = themeLayouts[theme];
  const { user } = useAuth();
  const { isAuthenticated } = useAuth();
  const { trackTabChange, trackCircuitOperation, trackSimulation, trackTutorialProgress, trackApplicationUsage } = useAnalytics();

  const [circuitCode, setCircuitCode] = useState('');
  const [reducedStates, setReducedStates] = useState<DensityMatrix[]>([]);
  const [currentCircuit, setCurrentCircuit] = useState<QuantumCircuit | null>(null);
  const [numQubits, setNumQubits] = useState(2);
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'circuit' | 'code' | 'applications' | 'visualization' | 'analytics' | 'vqe' | 'qml' | 'noise' | 'tutor' | 'gamify' | 'insights' | 'medical'>('circuit');
  const [syncDirection, setSyncDirection] = useState<'visual-to-code' | 'code-to-visual' | 'bidirectional'>('bidirectional');
  const [gateStates, setGateStates] = useState<{ [gateId: string]: { input: string; output: string } }>({});
  const [shouldAutoSimulate, setShouldAutoSimulate] = useState(false);
  const analysisRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auth modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);



  // ...existing code...

  // Local simulation only - no IBM Quantum integration





  // Track if circuit load message has been shown to prevent duplicates
  const [circuitLoadMessageShown, setCircuitLoadMessageShown] = useState(false);

  // Default mapVector function (identity)
  const mapVector = (vector: { x: number; y: number; z: number }) => vector;

  // Bloch Sphere Modal state
  const [isBlochModalOpen, setIsBlochModalOpen] = useState(false);

  // IBM Quantum state
  const { isAuthenticated: isIBMConnected, submitJob, currentJob } = useIBMQuantum();
  const [isIBMConnectionModalOpen, setIsIBMConnectionModalOpen] = useState(false);


  const nearlyEqual = (a: number, b: number, tol = 1e-2) => Math.abs(a - b) <= tol;
  const rounded = (v: { x: any; y: any; z: any }) => ({
    x: Number(typeof v.x === 'number' ? v.x.toFixed(3) : 0),
    y: Number(typeof v.y === 'number' ? v.y.toFixed(3) : 0),
    z: Number(typeof v.z === 'number' ? v.z.toFixed(3) : 0),
  });

  // Gate descriptions for educational purposes
  const getGateDescription = (gateName: string): string => {
    const descriptions: { [key: string]: string } = {
      'I': 'Identity gate - does nothing (keeps |0⟩ as |0⟩)',
      'X': 'Pauli-X gate - flips |0⟩ to |1⟩ (180° rotation around X)',
      'Y': 'Pauli-Y gate - flips |0⟩ to i|1⟩ (180° rotation around Y)',
      'Z': 'Pauli-Z gate - adds phase (keeps |0⟩ as |0⟩, flips phase of |1⟩)',
      'H': 'Hadamard gate - creates superposition (|0⟩ → |+⟩ on X-axis)',
      'S': 'S gate - rotation by 90° around Z (unchanged for |0⟩)',
      'T': 'T gate - rotation by 45° around Z (unchanged for |0⟩)',
      'RX': 'Rotation around X-axis (use 90° to reach Y-axis from Z)',
      'RY': 'Rotation around Y-axis (use 90° to reach X-axis from Z)',
      'RZ': 'Rotation around Z-axis',
      'CNOT': 'Controlled-NOT - flips target if control is |1⟩',
      'CZ': 'Controlled-Z - flips phase if both are |1⟩',
      'SWAP': 'Swap gate - exchanges states of two qubits',
      'CCNOT': 'Toffoli gate - controlled-controlled-NOT',
      'FREDKIN': 'Fredkin gate - controlled-SWAP',
      'CY': 'Controlled-Y - applies Y to target if control is |1⟩',
      'CH': 'Controlled-H - applies H to target if control is |1⟩',
      'RXX': 'Two-qubit rotation around XX axis',
      'RYY': 'Two-qubit rotation around YY axis',
      'RZZ': 'Two-qubit rotation around ZZ axis',
      'SQRTX': 'Square root of X gate',
      'SQRTY': 'Square root of Y gate',
      'SQRTZ': 'Square root of Z gate',
      'P': 'Phase gate - adds general phase'
    };
    return descriptions[gateName] || `${gateName} gate - quantum operation`;
  };

  // No IBM Quantum integration needed

  // Handle tab changes - sync code when switching to code tab
  useEffect(() => {
    if (activeTab === 'code' && currentCircuit && (syncDirection === 'visual-to-code' || syncDirection === 'bidirectional')) {
      const qiskitCode = circuitToQiskitCode(currentCircuit);
      setCircuitCode(qiskitCode);
    }
  }, [activeTab, currentCircuit, syncDirection]);

  // Track tab changes
  useEffect(() => {
    trackTabChange(activeTab);
  }, [activeTab, trackTabChange]);



  // No IBM Quantum authentication or backend management needed



  // Store initial ket states for each qubit (from CircuitBuilder)
  const [initialKetStates, setInitialKetStates] = useState<string[]>(Array(numQubits).fill('|0⟩'));

  // Compute gate states based on current circuit and initial ket states
  const computeGateStates = useCallback(() => {
    if (!currentCircuit) return {};

    const gateStates: { [gateId: string]: { input: string; output: string } } = {};
    const currentQubitStates = [...initialKetStates]; // Track state of each qubit

    currentCircuit.gates.forEach((gate, index) => {
      const gateId = `gate_${index}`;

      // Determine input state based on current qubit states
      let inputState = '|0⟩';
      if (gate.qubits.length === 1) {
        inputState = currentQubitStates[gate.qubits[0]] || '|0⟩';
      } else if (gate.qubits.length === 2) {
        const [q0, q1] = gate.qubits;
        const s0 = (currentQubitStates[q0] || '|0⟩').replace(/^\|(.)\⟩$/, '$1');
        const s1 = (currentQubitStates[q1] || '|0⟩').replace(/^\|(.)\⟩$/, '$1');
        inputState = `|${s0}${s1}⟩`;
      } else {
        // Multi-qubit fallback
        const states = gate.qubits.map(q => (currentQubitStates[q] || '|0⟩').replace(/^\|(.)\⟩$/, '$1'));
        inputState = `|${states.join('')}⟩`;
      }

      // Compute output state
      const outputState = computeGateOutputState(gate, inputState, currentCircuit.numQubits);
      gateStates[gateId] = { input: inputState, output: outputState };

      // Update current qubit states for next gates
      if (typeof outputState === 'string' && outputState.startsWith('|') && outputState.endsWith('⟩')) {
        const content = outputState.slice(1, -1);
        if (gate.qubits.length === 1) {
          currentQubitStates[gate.qubits[0]] = outputState;
        } else if (content.length === gate.qubits.length) {
          // Split separable states
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
          // Entangled
          gate.qubits.forEach(q => currentQubitStates[q] = 'Entangled');
        }
      }
    });

    return gateStates;
  }, [currentCircuit, initialKetStates]);

  // Update gate states whenever circuit or initial ket states change
  useEffect(() => {
    if (currentCircuit) {
      const newGateStates = computeGateStates();
      setGateStates(newGateStates);
    }
  }, [currentCircuit, initialKetStates, computeGateStates]);

  // Auto-simulate when requested (e.g. loading examples)
  useEffect(() => {
    if (shouldAutoSimulate && currentCircuit) {
      handleLocalSimulation();
      setShouldAutoSimulate(false);
    }
  }, [shouldAutoSimulate, currentCircuit]);

  // Convert circuit to Qiskit code
  const circuitToQiskitCode = (circuit: QuantumCircuit): string => {
    if (!circuit || circuit.gates.length === 0) {
      return `from qiskit import QuantumCircuit

qc = QuantumCircuit(${circuit?.numQubits || 2})
# Add your quantum gates here
`;
    }

    let code = `from qiskit import QuantumCircuit

qc = QuantumCircuit(${circuit.numQubits})

`;

    circuit.gates.forEach(gate => {
      const gateName = gate.name.toLowerCase();
      const qubits = gate.qubits.join(', ');

      switch (gate.name) {
        case 'H':
          code += `qc.h(${qubits})\n`;
          break;
        case 'X':
          code += `qc.x(${qubits})\n`;
          break;
        case 'Y':
          code += `qc.y(${qubits})\n`;
          break;
        case 'Z':
          code += `qc.z(${qubits})\n`;
          break;
        case 'S':
          code += `qc.s(${qubits})\n`;
          break;
        case 'T':
          code += `qc.t(${qubits})\n`;
          break;
        case 'RX':
          code += `qc.rx(${gate.parameters?.[0] || 'np.pi/2'}, ${qubits})\n`;
          break;
        case 'RY':
          code += `qc.ry(${gate.parameters?.[0] || 'np.pi/2'}, ${qubits})\n`;
          break;
        case 'RZ':
          code += `qc.rz(${gate.parameters?.[0] || 'np.pi/2'}, ${qubits})\n`;
          break;
        case 'CNOT':
          code += `qc.cx(${qubits})\n`;
          break;
        case 'CZ':
          code += `qc.cz(${qubits})\n`;
          break;
        case 'SWAP':
          code += `qc.swap(${qubits})\n`;
          break;
        default:
          code += `# Unknown gate: ${gate.name}(${qubits})\n`;
      }
    });

    return code;
  };

  // Pass setter to CircuitBuilder to keep states in sync
  const handleCircuitChange = (circuit: QuantumCircuit, ketStates?: string[]) => {
    setCurrentCircuit(circuit);

    // Update qubit count if circuit has different number
    if (circuit && circuit.numQubits !== numQubits) {
      setNumQubits(circuit.numQubits);
    }

    // Update code representation if sync is enabled
    if (syncDirection === 'visual-to-code' || syncDirection === 'bidirectional') {
      const qiskitCode = circuitToQiskitCode(circuit);
      setCircuitCode(qiskitCode);
    }

    if (ketStates) {
      setInitialKetStates(ketStates);
    }

    // Track circuit operation
    trackCircuitOperation('circuit_modified', circuit.numQubits);

    // Reset circuit load message status when user explicitly changes circuit
    setCircuitLoadMessageShown(false);
  };

  const handleExampleSelect = (exampleName: string) => {
    setSelectedExample(exampleName);
    const example = EXAMPLE_CIRCUITS[exampleName as keyof typeof EXAMPLE_CIRCUITS];
    if (example) {
      setCurrentCircuit(example);
      setCircuitCode(JSON.stringify(example, null, 2));
      setNumQubits(example.numQubits);
      // Reset circuit load message status when user explicitly loads an example
      setCircuitLoadMessageShown(false);
      // Trigger auto-simulation for immediate feedback
      setShouldAutoSimulate(true);
    }
  };

  const handleSimulate = async () => {
    if (!currentCircuit) {
      toast.error('Please create or load a circuit first');
      return;
    }

    await handleLocalSimulation();
  };

  const [simulationResult, setSimulationResult] = useState<{
    statevector: number[][];
    probabilities: number[];
    densityMatrix: number[][];
    reducedStates: DensityMatrix[];
    gateStates?: { [gateId: string]: { input: string; output: string } };
    error?: string;
  } | null>(null);

  const [ibmSimulationResult, setIbmSimulationResult] = useState<any>(null);

  const handleIbmSimulation = async () => {
    if (!currentCircuit) {
      toast.error('Please create or load a circuit first');
      return;
    }

    if (!isIBMConnected) {
      setIsIBMConnectionModalOpen(true);
      return;
    }

    try {
      // Prepare circuit for IBM submission
      const circuitData = {
        numQubits: currentCircuit.numQubits,
        gates: currentCircuit.gates.map(gate => ({
          name: gate.name,
          qubits: gate.qubits,
          parameters: Object.values(gate.parameters || {})
        }))
      };

      await submitJob(circuitData);
    } catch (error) {
      console.error('IBM Submission Error:', error);
      toast.error('Failed to submit job to IBM Quantum');
    }
  };

  const handleLocalSimulation = async () => {
    if (!currentCircuit) return;

    const startTime = Date.now();
    setIsSimulating(true);
    try {
      // Create initial state based on selected qubit states using COMPLEX numbers
      // This ensures compatibility with the complex-based simulation engine
      const createInitialStateFromKets = (ketStates: string[], numQubits: number) => {
        // Import complex number utilities
        const complex = (real: number, imag: number) => ({ real, imag });

        // For standard 2-level qubits, only |0⟩ and |1⟩ are valid
        // Map ket strings to binary values (ignore |2⟩ and |3⟩ for now)
        const ketToBit = (ket: string) => {
          switch (ket) {
            case '|0⟩': return 0;
            case '|1⟩': return 1;
            default: return 0; // Default to |0⟩ for invalid states
          }
        };

        // Calculate the computational basis index from individual qubit states
        let totalIndex = 0;
        for (let i = 0; i < Math.min(ketStates.length, numQubits); i++) {
          const bit = ketToBit(ketStates[i]);
          totalIndex += bit * Math.pow(2, numQubits - 1 - i);
        }

        // Create COMPLEX density matrix |ψ⟩⟨ψ| where |ψ⟩ is the computational basis state
        const dim = Math.pow(2, numQubits);
        const densityMatrix = Array(dim).fill(0).map(() =>
          Array(dim).fill(0).map(() => complex(0, 0))
        );

        if (totalIndex < dim) {
          densityMatrix[totalIndex][totalIndex] = complex(1, 0);
        } else {
          // Fallback to |00...0⟩ if index is out of bounds
          densityMatrix[0][0] = complex(1, 0);
        }

        return densityMatrix;
      };

      const initialState = createInitialStateFromKets(initialKetStates, currentCircuit.numQubits);
      const result = simulateCircuitWithStates(currentCircuit, initialState, initialKetStates);

      setSimulationResult(result);
      setReducedStates(result.reducedStates || []);
      setGateStates(result.gateStates || {});

      const duration = (Date.now() - startTime) / 1000;

      if (result.error) {
        toast.error(result.error);
        trackSimulation('local', duration, false);
      } else {
        toast.success(`Simulation complete! Circuit executed.`);
        trackSimulation('local', duration, true);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Simulation failed: ${errorMessage}`);
      trackSimulation('local', (Date.now() - startTime) / 1000, false);
    } finally {
      setIsSimulating(false);
    }
  };



  const handleReset = () => {
    setSimulationResult(null);
    setIbmSimulationResult(null);
    setReducedStates([]);
    setGateStates({});
    // Reset circuit load message status when user explicitly resets
    setCircuitLoadMessageShown(false);
    toast.info('Simulation reset');
  };

  const handleExport = () => {
    if (reducedStates.length === 0) {
      toast.error('No simulation results to export');
      return;
    }

    const data = {
      circuit: currentCircuit,
      results: reducedStates,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_states_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('Quantum states exported successfully!');
  };

  const handleDownloadImage = async (index: number) => {
    const el = analysisRefs.current[index];
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0b0b0f', scale: 2 });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qubit_${index}_analysis.png`;
    a.click();
  };

  const handleDownloadPdf = async (index: number) => {
    const el = analysisRefs.current[index];
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0b0b0f', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.setFontSize(14);
    pdf.text(`Quantum State Analysis - Qubit ${index}`, 40, 40);
    pdf.addImage(imgData, 'PNG', 40, 60, imgWidth, Math.min(imgHeight, pageHeight - 100));
    pdf.save(`qubit_${index}_analysis.pdf`);
  };

  return (

    <AppLayout>
      <Header />

      {/* Professional Main Workspace with Glassmorphism */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-16 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-16 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        <div className="container mx-auto px-6 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Fully Transparent Glassmorphic main card */}
            <div className="relative rounded-3xl overflow-hidden bg-transparent">
              {/* Minimal glass hint - just shadow and blur */}
              <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />

              <div className="p-4 relative z-10">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
                  {/* Professional Navigation with Glassmorphism */}
                  <div className="relative">
                    <TabsList className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 h-auto flex flex-wrap gap-2 w-full justify-start shadow-[0_4px_16px_0_rgba(0,0,0,0.25)]">
                      <TabsTrigger
                        value="circuit"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-cyan-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(6,182,212,0.4)] data-[state=active]:scale-105 hover:bg-cyan-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-cyan-500/30 transition-colors backdrop-blur-sm">
                          <Palette className="w-4 h-4 text-cyan-400 group-data-[state=active]:text-white" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-white font-medium">
                          Circuit
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="code"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-purple-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(168,85,247,0.4)] data-[state=active]:scale-105 hover:bg-purple-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-purple-500/30 transition-colors backdrop-blur-sm">
                          <Code className="w-4 h-4 text-purple-400 group-data-[state=active]:text-white" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-white font-medium">
                          Code
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="applications"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-blue-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(59,130,246,0.4)] data-[state=active]:scale-105 hover:bg-blue-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-blue-500/30 transition-colors backdrop-blur-sm">
                          <Shield className="w-4 h-4 text-blue-400 group-data-[state=active]:text-white" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-white font-medium">
                          Apps
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="visualization"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-emerald-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(16,185,129,0.4)] data-[state=active]:scale-105 hover:bg-emerald-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-emerald-500/30 transition-colors backdrop-blur-sm">
                          <BarChart3 className="w-4 h-4 text-emerald-400 group-data-[state=active]:text-white" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-white font-medium">
                          Visualize
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-orange-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(249,115,22,0.4)] data-[state=active]:scale-105 hover:bg-orange-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-orange-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-orange-500/30 transition-colors backdrop-blur-sm">
                          <TrendingUp className="w-4 h-4 text-orange-400 group-data-[state=active]:text-white" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-white font-medium">
                          Analytics
                        </span>
                      </TabsTrigger>
                      {/* Add glassmorphic styling to remaining tabs */}
                      <TabsTrigger
                        value="vqe"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-indigo-500/80 data-[state=active]:backdrop-blur-md data-[state=active]:shadow-[0_4px_20px_0_rgba(99,102,241,0.4)] data-[state=active]:scale-105 hover:bg-indigo-500/30 hover:backdrop-blur-md hover:shadow-lg hover:scale-105 bg-transparent data-[state=active]:border data-[state=active]:border-white/20"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-blue-500/30 transition-colors">
                          <Atom className="w-4 h-4 text-blue-500 group-data-[state=active]:text-blue-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-blue-50 font-medium">
                          VQE
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="medical-imaging"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-teal-500 data-[state=active]:shadow-xl data-[state=active]:scale-105 hover:bg-teal-500/60 hover:shadow-lg hover:scale-105"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500/20 to-teal-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-teal-500/30 transition-colors">
                          <Activity className="w-4 h-4 text-teal-500 group-data-[state=active]:text-teal-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-teal-50 font-medium">
                          Medical
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="noise"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-red-500 data-[state=active]:shadow-xl data-[state=active]:scale-105 hover:bg-red-500/60 hover:shadow-lg hover:scale-105"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500/20 to-red-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-red-500/30 transition-colors">
                          <Shield className="w-4 h-4 text-red-500 group-data-[state=active]:text-red-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-red-50 font-medium">
                          Noise
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="tutor"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-indigo-500 data-[state=active]:shadow-xl data-[state=active]:scale-105 hover:bg-indigo-500/60 hover:shadow-lg hover:scale-105"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-indigo-500/30 transition-colors">
                          <MessageCircle className="w-4 h-4 text-indigo-500 group-data-[state=active]:text-indigo-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-indigo-50 font-medium">
                          Tutor
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="gamify"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-yellow-500 data-[state=active]:shadow-xl data-[state=active]:scale-105 hover:bg-yellow-500/60 hover:shadow-lg hover:scale-105"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-yellow-500/30 transition-colors">
                          <Gamepad2 className="w-4 h-4 text-yellow-500 group-data-[state=active]:text-yellow-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-yellow-50 font-medium">
                          Quest
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="insights"
                        className="group relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-cyan-500 data-[state=active]:shadow-xl data-[state=active]:scale-105 hover:bg-cyan-500/60 hover:shadow-lg hover:scale-105"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center group-data-[state=active]:bg-cyan-500/30 transition-colors">
                          <BarChart3 className="w-4 h-4 text-cyan-500 group-data-[state=active]:text-cyan-50" />
                        </div>
                        <span className="text-muted-foreground group-data-[state=active]:text-cyan-50 font-medium">
                          Insights
                        </span>
                      </TabsTrigger>

                    </TabsList>

                    {/* Active Tab Glow Effect */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-primary/50 via-accent to-secondary/50 rounded-full blur-sm opacity-60" />
                  </div>

                  {/* Circuit Builder */}
                  <TabsContent value="circuit" className="space-y-4">

                    <div className={`grid grid-cols-1 xl:grid-cols-12 ${layout.containerClass}`}>
                      {/* Left Column - Circuit Canvas */}
                      <div className={`${layout.circuitBuilderColSpan} space-y-4 ${layout.orderReversed ? 'xl:order-2' : ''}`}>
                        <Card className="border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden relative">
                          {/* Glass reflection */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

                          <CardContent className="p-4 relative">
                            <CircuitBuilder
                              onCircuitChange={(circuitData: { numQubits: number; gates: Array<{ name: string; qubits: number[]; parameters?: { [key: string]: number } }> }, ketStates?: string[]) => {
                                // Convert CircuitData back to QuantumCircuit format for internal use
                                const circuit: QuantumCircuit = {
                                  numQubits: circuitData.numQubits,
                                  gates: circuitData.gates.map((gateData) => ({
                                    name: gateData.name,
                                    qubits: gateData.qubits,
                                    parameters: gateData.parameters
                                  }))
                                };
                                handleCircuitChange(circuit, ketStates);
                              }}
                              onKetStatesChange={setInitialKetStates}
                              numQubits={numQubits}
                              onQubitCountChange={setNumQubits}
                              initialCircuit={currentCircuit ? {
                                numQubits: currentCircuit.numQubits,
                                gates: currentCircuit.gates.map(gate => ({
                                  name: gate.name,
                                  qubits: gate.qubits,
                                  parameters: gate.parameters
                                }))
                              } : undefined}
                            />
                          </CardContent>
                        </Card>

                        {/* Control Buttons */}
                        <div className="flex gap-4">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              onClick={handleSimulate}
                              disabled={
                                isSimulating ||
                                !currentCircuit
                              }
                              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                            >
                              {isSimulating ? (
                                <div className="flex items-center gap-3">
                                  <Loading size="sm" variant="spinner" />
                                  <span className="text-sm font-medium">
                                    Running Simulation...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Play className="w-5 h-5" />
                                  <span className="text-sm font-medium">
                                    Run Local Simulation
                                  </span>
                                </div>
                              )}
                            </Button>
                          </motion.div>

                          {isIBMConnected && (
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1"
                            >
                              <Button
                                variant="outline"
                                onClick={handleIbmSimulation}
                                disabled={
                                  !currentCircuit || currentJob?.status === 'running' || currentJob?.status === 'queued'
                                }
                                className="w-full h-10 bg-purple-500 hover:bg-purple-600 text-white border-0 disabled:opacity-50"
                              >
                                <div className="flex items-center gap-3">
                                  {currentJob?.status === 'running' || currentJob?.status === 'queued' ? (
                                    <>
                                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                                      <span className="text-sm font-medium">
                                        {currentJob?.status === 'running' ? 'Running...' : 'Queued...'}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-5 h-5" />
                                      <span className="text-sm font-medium">
                                        Run IBM Quantum
                                      </span>
                                    </>
                                  )}
                                </div>
                              </Button>
                            </motion.div>
                          )}

                          <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={isSimulating}
                            className="px-6 h-10 border-border text-muted-foreground hover:bg-muted hover:border-primary rounded-xl"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                        </div>

                      </div>

                      {/* Right Column - Quantum State Analysis */}
                      <div className={`${layout.analysisColSpan} space-y-6 ${layout.orderReversed ? 'xl:order-1' : ''}`}>
                        {/* Enhanced Simulation Results Panel with Glassmorphism */}
                        {(simulationResult || ibmSimulationResult) && (
                          <div className="border border-white/20 rounded-2xl overflow-hidden relative shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                            {/* Glass shine effect */}
                            <div className="absolute inset-0 backdrop-blur-md bg-transparent pointer-events-none" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                            <div className="relative p-4 border-b border-white/10">
                              <div className="text-sm font-semibold flex items-center gap-3 text-foreground">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                                Quantum Simulation Results
                                {(simulationResult && ibmSimulationResult) && (
                                  <Badge variant="outline" className="ml-auto text-xs border-white/20 bg-white/10 backdrop-blur-sm">
                                    Comparison Mode
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="p-4 relative">
                              {(simulationResult?.error || ibmSimulationResult?.error) ? (
                                <Alert className="mb-4 border-red-500/20 bg-red-500/10">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <AlertDescription className="text-red-300">
                                    {simulationResult?.error || ibmSimulationResult?.error}
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                <div className="space-y-4">
                                  {/* Overall Circuit Information */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <div className="text-xs text-muted-foreground mb-2">Circuit Size</div>
                                      <div className="text-lg font-semibold text-foreground">{currentCircuit?.numQubits} qubits</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <div className="text-xs text-muted-foreground mb-2">Total Gates</div>
                                      <div className="text-lg font-semibold text-foreground">{currentCircuit?.gates?.length || 0}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <div className="text-xs text-muted-foreground mb-2">Simulations</div>
                                      <div className="text-sm font-semibold text-foreground">
                                        {simulationResult ? 'Local' : ''}{simulationResult && ibmSimulationResult ? ' + ' : ''}{ibmSimulationResult ? 'IBM' : ''}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Results Comparison */}
                                  {(simulationResult || ibmSimulationResult) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {/* Local Simulation Results */}
                                      {simulationResult && (
                                        <div className="border border-cyan-500/30 rounded-lg p-4 bg-cyan-500/5">
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-cyan-300">Local Simulator</h4>
                                            <Badge variant="outline" className="text-xs ml-auto">Exact</Badge>
                                          </div>
                                          <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Method:</span>
                                              <span className="font-mono">State Vector</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Precision:</span>
                                              <span className="font-mono">Floating Point</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Time:</span>
                                              <span className="font-mono">Instant</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* IBM Quantum Results */}
                                      {ibmSimulationResult && (
                                        <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5">
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-purple-300">IBM Quantum</h4>
                                            <Badge variant="outline" className="text-xs ml-auto">{ibmSimulationResult.backendId}</Badge>
                                          </div>
                                          <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Method:</span>
                                              <span className="font-mono">Shot-based</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Shots:</span>
                                              <span className="font-mono">{ibmSimulationResult.shots.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Job ID:</span>
                                              <span className="font-mono text-xs">{ibmSimulationResult.jobId.slice(-8)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Gate Descriptions - Show BEFORE Bloch Spheres */}
                                  {currentCircuit && currentCircuit.gates.length > 0 && (
                                    <div className="border border-slate-800 rounded-lg bg-slate-900/30 p-4">
                                      <h4 className="text-sm font-semibold mb-3">
                                        Gate Operations Applied
                                      </h4>
                                      <div className="space-y-6">
                                        {currentCircuit.gates.map((gate, index) => {
                                          const gateStatesInfo = gateStates[`gate_${index}`];
                                          return (
                                            <div key={index} className="border-l-2 border-primary/30 pl-6 space-y-2">
                                              <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary px-3 py-1">
                                                  {gate.name}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  Qubit{gate.qubits.length > 1 ? 's' : ''} {gate.qubits.join(', ')}
                                                </span>
                                              </div>

                                              {/* Gate Description */}
                                              <div className="text-xs text-muted-foreground space-y-2">
                                                <div className="font-medium text-foreground">
                                                  {getGateDescription(gate.name)}
                                                </div>
                                                {gateStatesInfo && (
                                                  <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                      <span className="text-muted-foreground font-medium text-cyan-400">Output:</span>
                                                      <Badge variant="secondary" className="text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-1">
                                                        {typeof gateStatesInfo.output === 'string' ? gateStatesInfo.output : 'Complex State'}
                                                      </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 opacity-80">
                                                      <span className="text-muted-foreground">Input:</span>
                                                      <Badge variant="outline" className="text-xs font-mono border-border text-muted-foreground px-2 py-1">
                                                        {typeof gateStatesInfo.input === 'string' ? gateStatesInfo.input : 'Complex State'}
                                                      </Badge>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Bloch Spheres for Active Qubits Only */}
                                  {reducedStates.length > 0 && (() => {
                                    // Filter to show only qubits that have gates applied to them
                                    const activeQubits = reducedStates
                                      .map((state, index) => ({ state, index }))
                                      .filter(({ index }) => {
                                        return currentCircuit?.gates.some(gate =>
                                          gate.qubits.includes(index)
                                        );
                                      });

                                    // If no qubits have gates, show all qubits (fallback for initial state visualization)
                                    const qubitsToShow = activeQubits.length > 0 ? activeQubits : reducedStates.map((state, index) => ({ state, index }));

                                    return qubitsToShow.length > 0 ? (
                                      <div className="py-2">
                                        <div className="flex items-center justify-between mb-4">
                                          <h4 className="text-sm font-semibold text-gray-200">
                                            Bloch Sphere Representations
                                            <span className="text-xs text-gray-400 ml-2">
                                              ({qubitsToShow.length} qubit{qubitsToShow.length !== 1 ? 's' : ''})
                                            </span>
                                          </h4>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsBlochModalOpen(true)}
                                            className="bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400"
                                          >
                                            <Earth className="w-4 h-4 mr-2" />
                                            View All
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                          {qubitsToShow.map(({ state, index }) => (
                                            <Card key={index} className="border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-2xl hover:shadow-[0_8px_40px_0_rgba(6,182,212,0.3)] transition-all duration-300 relative overflow-hidden">
                                              {/* Glass reflection overlay */}
                                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

                                              <CardHeader className="pb-3 relative">
                                                <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                                                  <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                                  Qubit {index}
                                                </CardTitle>
                                              </CardHeader>
                                              <CardContent className="p-4 space-y-4 relative">
                                                <div className="h-80 w-full bg-gray-900/50 border border-gray-700/30 rounded-lg p-3 flex items-center justify-center relative overflow-hidden">
                                                  {/* Safety check for valid Bloch vector */}
                                                  {state.blochVector && !isNaN(state.blochVector.x) ? (
                                                    <BlochSphere3D
                                                      vector={mapVector(state.blochVector)}
                                                      size={400}
                                                      className="w-full h-full"
                                                    />
                                                  ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                                      Invalid State Vector
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="text-xs space-y-2 pt-2 border-t border-white/5">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Purity:</span>
                                                    <span className="font-mono font-semibold text-gray-200">{state.purity?.toFixed(3) || '1.000'}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Superposition:</span>
                                                    <span className="font-mono font-semibold text-gray-200">{state.superposition?.toFixed(3) || '0.000'}</span>
                                                  </div>
                                                  {currentCircuit && currentCircuit.numQubits > 1 && (
                                                    <div className="flex justify-between items-center">
                                                      <span className="text-gray-400">Entanglement:</span>
                                                      <span className="font-mono font-semibold text-gray-200">{state.entanglement?.toFixed(3) || '0.000'}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 text-sm py-4">
                                        No qubits to display.
                                      </div>
                                    );
                                  })()}

                                  {/* Detailed Quantum Parameters */}
                                  <div className="grid grid-cols-1 gap-4 pt-4">
                                    {/* Quantum State Properties */}
                                    <Card className="border-border/50">
                                      <CardHeader>
                                        <CardTitle className="text-sm text-gray-200">Quantum State Properties</CardTitle>
                                      </CardHeader>
                                      <CardContent className="p-4">
                                        <div className="space-y-4">
                                          {(() => {
                                            const activeQubits = reducedStates
                                              .map((state, index) => ({ state, index }))
                                              .filter(({ index }) => {
                                                return currentCircuit?.gates.some(gate =>
                                                  gate.qubits.includes(index)
                                                );
                                              });

                                            const qubitsToShow = activeQubits.length > 0 ? activeQubits : reducedStates.map((state, index) => ({ state, index }));

                                            return qubitsToShow.map(({ state, index }) => (
                                              <div key={index} className="border-b border-gray-700/20 pb-4 last:border-b-0">
                                                <div className="text-xs font-semibold mb-3 text-gray-200">Qubit {index}</div>
                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                  <div>
                                                    <span className="text-gray-400">Bloch Vector:</span>
                                                    <div className="font-mono text-gray-300 mt-1">
                                                      x: {state.blochVector.x.toFixed(3)}<br />
                                                      y: {state.blochVector.y.toFixed(3)}<br />
                                                      z: {state.blochVector.z.toFixed(3)}
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400">Properties:</span>
                                                    <div className="font-mono text-gray-300 mt-1">
                                                      Purity: {state.purity?.toFixed(3) || '1.000'}<br />
                                                      Radius: {state.reducedRadius?.toFixed(3) || '1.000'}<br />
                                                      {state.isEntangled !== undefined && (
                                                        <>Entangled: {state.isEntangled ? 'Yes' : 'No'}</>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ));
                                          })()}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Technical Details (Collapsible) */}
                                  <details className="group pt-2">
                                    <summary className="cursor-pointer text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors">
                                      Technical Details
                                    </summary>
                                    <div className="mt-3 space-y-4">
                                      <div>
                                        <strong className="text-xs text-gray-300">Full Density Matrix:</strong>
                                        <pre className="bg-gray-800/30 rounded p-2 text-xs overflow-x-auto mt-1 text-gray-300">
                                          {simulationResult?.densityMatrix ? formatDensityMatrix(simulationResult.densityMatrix) : 'No Data'}
                                        </pre>
                                      </div>
                                      {reducedStates.length > 0 && (
                                        <div>
                                          <strong className="text-xs text-gray-300">Reduced Density Matrices:</strong>
                                          <div className="grid grid-cols-1 gap-3 mt-2">
                                            {reducedStates.map((state, index) => (
                                              <div key={index}>
                                                <div className="text-xs font-semibold mb-1 text-gray-200">Qubit {index}:</div>
                                                <pre className="bg-gray-800/30 rounded p-2 text-xs text-gray-300">
                                                  {formatDensityMatrix(state.matrix)}
                                                </pre>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        )}




                      </div>
                    </div>
                  </TabsContent>





                  {/* Code Editor */}
                  <TabsContent value="code" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="xl:col-span-8">
                        <CodeEditor
                          onCircuitChange={(circuit) => {
                            setCurrentCircuit(circuit);
                            // Update qubit count if circuit has different number
                            if (circuit && circuit.numQubits !== numQubits) {
                              setNumQubits(circuit.numQubits);
                            }
                            // Update code if sync allows code-to-visual
                            if (syncDirection === 'code-to-visual' || syncDirection === 'bidirectional') {
                              const qiskitCode = circuitToQiskitCode(circuit);
                              setCircuitCode(qiskitCode);
                            }
                            // Reset circuit load message status when user explicitly changes circuit
                            setCircuitLoadMessageShown(false);
                          }}
                          onResultsChange={setReducedStates}
                          initialCode={circuitCode}
                          layoutMode="full"
                        />
                      </div>

                      {/* Code Editor Sidebar */}
                      <div className="xl:col-span-4 space-y-6">
                        {/* Circuit Preview */}
                        {currentCircuit && (
                          <Card className="border-accent/20">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-accent">
                                <CircuitBoard className="w-5 h-5" />
                                Circuit Preview
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                {/* Circuit Stats */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="bg-muted/20 rounded-lg p-4">
                                    <div className="text-muted-foreground mb-1">Qubits</div>
                                    <div className="font-semibold text-lg">{currentCircuit.numQubits}</div>
                                  </div>
                                  <div className="bg-muted/20 rounded-lg p-4">
                                    <div className="text-muted-foreground mb-1">Gates</div>
                                    <div className="font-semibold text-lg">{currentCircuit.gates.length}</div>
                                  </div>
                                </div>

                                {/* Circuit Diagram */}
                                <div className="border border-muted/20 rounded-lg p-4 bg-background/50">
                                  <CircuitDiagram circuit={currentCircuit} />
                                </div>

                                {/* Gate List */}
                                {currentCircuit.gates.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Gates Applied:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {currentCircuit.gates.map((gate, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {gate.name}({gate.qubits.join(',')})
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}


                      </div>
                    </div>
                  </TabsContent>


                  {/* Quantum Applications */}
                  <TabsContent value="applications" className="space-y-6">
                    <QuantumApplications
                      onCircuitLoad={(circuit) => {
                        setCurrentCircuit(circuit);
                        setNumQubits(circuit.numQubits);
                        // Track application usage
                        trackApplicationUsage('quantum_applications', 'circuit_loaded');
                        // Switch to circuit tab to show the loaded circuit
                        setActiveTab('circuit');
                        // Only show toast message once per circuit load
                        if (!circuitLoadMessageShown) {
                          toast.success('Application circuit loaded! Switch to Circuit tab to explore.');
                          setCircuitLoadMessageShown(true);
                        }
                      }}
                    />
                  </TabsContent>

                  {/* Advanced Visualization */}
                  <TabsContent value="visualization" className="space-y-6">
                    <AdvancedVisualization
                      circuit={currentCircuit}
                      results={reducedStates}
                    />
                  </TabsContent>

                  {/* Analytics & Performance */}
                  <TabsContent value="analytics" className="space-y-6">
                    <QuantumAnalytics
                      circuit={currentCircuit}
                      results={reducedStates}
                      executionMethod="local"
                      backend="Local Simulator"
                    />
                  </TabsContent>


                  {/* VQE Playground */}
                  <TabsContent value="vqe" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <VQEPlayground />
                    </Suspense>
                  </TabsContent>


                  {/* Quantum Medical Imaging */}
                  <TabsContent value="medical-imaging" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <QuantumMedicalImaging />
                    </Suspense>
                  </TabsContent>

                  {/* Noise Simulator */}
                  <TabsContent value="noise" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <NoiseSimulator />
                    </Suspense>
                  </TabsContent>

                  {/* AI Tutor */}
                  <TabsContent value="tutor" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <AITutor
                        circuitState={{
                          currentCircuit,
                          simulationResults: simulationResult || null,
                          activeTab
                        }}
                        onRequestTabSwitch={(tab, reason) => {
                          setActiveTab(tab as typeof activeTab);
                          toast.info(`Switched to ${tab} tab: ${reason}`);
                        }}
                        onStepComplete={(goalId, stepId) => {
                          // Track step completion
                          trackTutorialProgress('step_completed', 0, true);
                          toast.success('Step completed! Great work!');
                        }}
                      />
                    </Suspense>
                  </TabsContent>

                  {/* Gamification System */}
                  <TabsContent value="gamify" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <GamificationSystem />
                    </Suspense>
                  </TabsContent>

                  {/* Advanced Analytics */}
                  <TabsContent value="insights" className="space-y-6">
                    <Suspense fallback={<Loading size="lg" />}>
                      <AdvancedAnalytics />
                    </Suspense>
                  </TabsContent>



                </Tabs>
              </div>
            </div>

            {/* Bloch Sphere Modal */}
            <BlochSphereModal
              isOpen={isBlochModalOpen}
              onClose={() => setIsBlochModalOpen(false)}
              results={reducedStates}
              mapVector={mapVector}
            />

            {/* Authentication Modals */}
            <LoginModal
              isOpen={isLoginModalOpen}
              onClose={() => setIsLoginModalOpen(false)}
              onSwitchToRegister={() => {
                setIsLoginModalOpen(false);
                setIsRegisterModalOpen(true);
              }}
            />

            <RegisterModal
              isOpen={isRegisterModalOpen}
              onClose={() => setIsRegisterModalOpen(false)}
              onSwitchToLogin={() => {
                setIsRegisterModalOpen(false);
                setIsLoginModalOpen(true);
              }}
            />

            <IBMQuantumConnection
              isOpen={isIBMConnectionModalOpen}
              onClose={() => setIsIBMConnectionModalOpen(false)}
            />




            {/* Floating AI Assistant */}
            <FloatingAI />
          </motion.div>
        </div >
      </div >
    </AppLayout >
  );
};

export default Workspace;