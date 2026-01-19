/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Editor, OnMount } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play,
  Download,
  Save,
  Share2,
  AlertCircle,
  CheckCircle,
  StepForward,
  RotateCcw,
  FileText,
  Image,
  FileImage,
  Code2,
  CircuitBoard,
  Loader2,
  Upload,
  Earth,
  Activity,
  CheckCircle2,
  Circle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import beautify from 'js-beautify';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CircuitDiagram from '../core/CircuitDiagram';
import BlochSphere3D from '../core/BlochSphere';
import StepByStepExecution from '../advanced/StepByStepExecution';
import QubitStateTable from '../core/QubitStateTable';
import {
  simulateCircuit,
  parseQuantumCode,
  validateQuantumCode,
  suggestFixes,
  executeOnIBMQuantum,
  type QuantumCircuit,
  type DensityMatrix,
  type CodeError,
  type CodeSuggestion
} from '@/utils/quantum/quantumCodeParser';

import { useIBMQuantum } from '@/contexts/IBMQuantumContext';

interface CodeEditorProps {
  onCircuitChange?: (circuit: QuantumCircuit) => void;
  onResultsChange?: (results: DensityMatrix[]) => void;
  initialCode?: string;
  layoutMode?: 'full' | 'editor-only';
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  onCircuitChange,
  onResultsChange,
  initialCode = '',
  layoutMode = 'full'
}) => {
  const { isAuthenticated: isIBMConnected, submitJob, currentJob } = useIBMQuantum();
  const [code, setCode] = useState(initialCode);
  const [circuit, setCircuit] = useState<QuantumCircuit | null>(null);
  const [results, setResults] = useState<DensityMatrix[]>([]);
  const [errors, setErrors] = useState<CodeError[]>([]);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStepping, setIsStepping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isComputingReduced, setIsComputingReduced] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [executionStep, setExecutionStep] = useState(0);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const circuitRef = useRef<HTMLDivElement>(null);
  const analysisRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced quantum code templates with better examples
  const codeTemplates = {
    qiskit: `# Qiskit Quantum Circuit Example
from qiskit import QuantumCircuit

# Create a 2-qubit quantum circuit
qc = QuantumCircuit(2)

# Apply Hadamard gate to first qubit (creates superposition)
qc.h(0)

# Apply CNOT gate (entangles qubits)
qc.cx(0, 1)

# Measure all qubits
qc.measure_all()
`,
    qiskit_advanced: `# Advanced Qiskit Example - Quantum Teleportation
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister

# Create quantum and classical registers
qr = QuantumRegister(3, 'q')
cr = ClassicalRegister(3, 'c')
qc = QuantumCircuit(qr, cr)

# Prepare initial state on qubit 0
qc.h(0)

# Create entanglement between qubits 1 and 2
qc.cx(1, 2)

# Bell measurement on qubits 0 and 1
qc.cx(0, 1)
qc.h(0)

# Measure qubits 0 and 1
qc.measure(0, 0)
qc.measure(1, 1)

# Apply corrections based on measurement results
qc.x(2).c_if(cr, 1)
qc.z(2).c_if(cr, 2)
`,
    cirq: `# Cirq Quantum Circuit Example
import cirq

# Create qubits
q0, q1 = cirq.LineQubit.range(2)

# Create circuit
circuit = cirq.Circuit()

# Apply gates
circuit.append(cirq.H(q0))
circuit.append(cirq.CNOT(q0, q1))

# Add measurements
circuit.append(cirq.measure(q0, q1))
`,
    json: `{
  "numQubits": 2,
  "gates": [
    {"name": "H", "qubits": [0]},
    {"name": "CNOT", "qubits": [0, 1]}
  ]
}`
  } as const;

  const sampleCircuits: Record<string, string> = {
    'Bell State (Entanglement)': codeTemplates.qiskit,
    'GHZ State (3-qubit)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(3)
qc.h(0)
qc.cx(0, 1)
qc.cx(0, 2)
`,
    'Quantum Teleportation': codeTemplates.qiskit_advanced,
    'Superdense Coding': `from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
qr = QuantumRegister(2, 'q')
cr = ClassicalRegister(2, 'c')
qc = QuantumCircuit(qr, cr)
# Create entangled pair
qc.h(0)
qc.cx(0, 1)
# Encode 2 classical bits (00 = I, 01 = X, 10 = Z, 11 = XZ)
# For demonstration, encode '11' (XZ)
qc.x(0)
qc.z(0)
# Decode
qc.cx(0, 1)
qc.h(0)
qc.measure_all()
`,
    'Quantum Key Distribution (BB84)': `from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
qr = QuantumRegister(2, 'q')
cr = ClassicalRegister(2, 'c')
qc = QuantumCircuit(qr, cr)
# Alice prepares random bits and bases
qc.h(0)  # Random bit 0 in X basis
qc.x(1)  # Random bit 1 in Z basis
# Bob measures in random bases
qc.h(1)  # Bob chooses X basis for qubit 1
qc.measure_all()
`,
    'Error Correction (Bit Flip)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(5)
# Encode logical qubit |0⟩ -> |00000⟩
qc.cx(0, 3)
qc.cx(0, 4)
# Simulate bit flip error on qubit 1
qc.x(1)
# Error syndrome measurement
qc.cx(0, 1)
qc.cx(2, 1)
qc.cx(0, 2)
qc.cx(3, 1)
qc.cx(4, 1)
qc.cx(3, 2)
qc.measure_all()
`,
    'Deutsch-Jozsa (2-qubit)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(3)
# Initialize oracle qubit
qc.x(2)
# Apply Hadamard gates
qc.h(0)
qc.h(1)
qc.h(2)
# Oracle function (constant: f(x) = 0)
# For balanced function, add: qc.cx(0, 2); qc.cx(1, 2)
# Apply Hadamard again
qc.h(0)
qc.h(1)
qc.measure_all()
`,
    'Grover Search (2-qubit)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(2)
# Initialize superposition
qc.h(0)
qc.h(1)
# Oracle (mark state |11⟩)
qc.cz(0, 1)
# Diffusion operator
qc.h(0)
qc.h(1)
qc.z(0)
qc.z(1)
qc.cz(0, 1)
qc.h(0)
qc.h(1)
`,
    'QFT (3-qubit)': `from qiskit import QuantumCircuit
import numpy as np
qc = QuantumCircuit(3)
# Apply Hadamard gates
qc.h(0)
qc.h(1)
qc.h(2)
# Apply controlled rotations
qc.cp(np.pi/2, 0, 1)
qc.cp(np.pi/4, 0, 2)
qc.cp(np.pi/2, 1, 2)
# Swap qubits
qc.swap(0, 2)
`,
    'Quantum Walk (4-step)': `from qiskit import QuantumCircuit
import numpy as np
qc = QuantumCircuit(3)  # 2 position + 1 coin qubit
# Initialize coin in superposition
qc.h(2)
# Position encoding
qc.cx(2, 0)
qc.x(2)
qc.cx(2, 1)
qc.x(2)
# Multiple steps (simplified)
for _ in range(2):
    qc.h(2)
    qc.cx(2, 0)
    qc.x(2)
    qc.cx(2, 1)
    qc.x(2)
`,
    'Variational Circuit (VQE)': `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
qc = QuantumCircuit(2)
# Variational parameters
theta1 = Parameter('θ₁')
theta2 = Parameter('θ₂')
phi1 = Parameter('φ₁')
phi2 = Parameter('φ₂')
# Ansatz layers
qc.ry(theta1, 0)
qc.ry(theta2, 1)
qc.cx(0, 1)
qc.rz(phi1, 0)
qc.rz(phi2, 1)
qc.cx(0, 1)
qc.ry(theta1, 0)
qc.ry(theta2, 1)
`,
    'QAOA (Max-Cut)': `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np
qc = QuantumCircuit(3)
# Parameters
gamma = Parameter('γ')
beta = Parameter('β')
# Initial superposition
qc.h(0)
qc.h(1)
qc.h(2)
# Problem Hamiltonian (cost function)
qc.rzz(gamma, 0, 1)
qc.rzz(gamma, 1, 2)
# Mixer Hamiltonian
qc.rx(2*beta, 0)
qc.rx(2*beta, 1)
qc.rx(2*beta, 2)
`,
    'Random Quantum Circuit': `from qiskit import QuantumCircuit
import numpy as np
qc = QuantumCircuit(3)
# Random single-qubit gates
qc.ry(np.pi/4, 0)
qc.rz(np.pi/3, 1)
qc.rx(np.pi/6, 2)
# Random entangling gates
qc.cx(0, 1)
qc.cz(1, 2)
qc.cx(0, 2)
# More random rotations
qc.ry(np.pi/2, 0)
qc.rz(np.pi/4, 1)
qc.rx(np.pi/3, 2)
`,
    'Controlled-Controlled-X (Toffoli)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(3)
# Prepare input states
qc.x(0)  # Control 1
qc.x(1)  # Control 2
# Toffoli gate implementation
qc.h(2)
qc.cx(1, 2)
qc.tdg(2)
qc.cx(0, 2)
qc.t(2)
qc.cx(1, 2)
qc.tdg(2)
qc.cx(0, 2)
qc.t(1)
qc.t(2)
qc.h(2)
qc.cx(0, 1)
qc.t(0)
qc.tdg(1)
qc.cx(0, 1)
`,
    'Quantum Fourier Transform (4-qubit)': `from qiskit import QuantumCircuit
import numpy as np
qc = QuantumCircuit(4)
# Apply Hadamard gates
qc.h(0)
qc.h(1)
qc.h(2)
qc.h(3)
# Apply controlled rotations
qc.cp(np.pi/2, 0, 1)
qc.cp(np.pi/4, 0, 2)
qc.cp(np.pi/8, 0, 3)
qc.cp(np.pi/2, 1, 2)
qc.cp(np.pi/4, 1, 3)
qc.cp(np.pi/2, 2, 3)
# Swap qubits
qc.swap(0, 3)
qc.swap(1, 2)
`,
    'Amplitude Estimation': `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np
qc = QuantumCircuit(4)  # 3 counting + 1 oracle qubit
# Initialize superposition
qc.h(0)
qc.h(1)
qc.h(2)
# Prepare oracle qubit
qc.x(3)
qc.h(3)
# Controlled oracle operations (simplified)
theta = Parameter('θ')
qc.cry(theta, 0, 3)
qc.cry(2*theta, 1, 3)
qc.cry(4*theta, 2, 3)
# Inverse QFT
qc.h(0)
qc.cp(-np.pi/2, 0, 1)
qc.h(1)
qc.cp(-np.pi/4, 0, 2)
qc.cp(-np.pi/2, 1, 2)
qc.h(2)
qc.swap(0, 2)
`,
    'W State (3-qubit)': `from qiskit import QuantumCircuit
import numpy as np
qc = QuantumCircuit(3)
# Create W state: (|001⟩ + |010⟩ + |100⟩)/√3
qc.ry(2*np.arccos(1/np.sqrt(3)), 0)
qc.cx(0, 1)
qc.cx(0, 2)
qc.x(0)
qc.cx(1, 0)
qc.cx(2, 0)
qc.x(0)
`,
    'Cluster State (4-qubit)': `from qiskit import QuantumCircuit
qc = QuantumCircuit(4)
# Initialize in |+⟩ states
qc.h(0)
qc.h(1)
qc.h(2)
qc.h(3)
# Create cluster state connectivity
qc.cz(0, 1)
qc.cz(1, 2)
qc.cz(2, 3)
qc.cz(1, 3)
`,
    'Quantum Machine Learning Circuit': `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
qc = QuantumCircuit(4)
# Encoding layer
x1 = Parameter('x₁')
x2 = Parameter('x₂')
qc.ry(x1, 0)
qc.ry(x2, 1)
# Variational layer
theta1 = Parameter('θ₁')
theta2 = Parameter('θ₂')
theta3 = Parameter('θ₃')
qc.ry(theta1, 0)
qc.ry(theta2, 1)
qc.cx(0, 1)
qc.ry(theta3, 2)
qc.cx(1, 2)
qc.cx(2, 3)
# Measurement
qc.measure_all()
`
  };

  // OpenQASM templates for quick insertion
  const qasmTemplates: Record<string, string> = {
    '|0⟩ (1 qubit)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\n`,
    '|1⟩ (1 qubit)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\nx q[0];\n`,
    '|+⟩ (1 qubit)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\nh q[0];\n`,
    '|−⟩ (1 qubit)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\nx q[0];\nh q[0];\n`,
    'Bell (2 qubits)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\nh q[0];\ncx q[0],q[1];\n`,
    'GHZ (3 qubits)': `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[3];\nh q[0];\ncx q[0],q[1];\ncx q[0],q[2];\n`
  };

  // REST API wrappers (fallback to local if request fails)
  const postJSON = async (url: string, body: any) => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      throw e;
    }
  };

  const apiExecute = async () => {
    if (!code.trim()) throw new Error('No code to execute');
    const payload = { code };
    try {
      const data = await postJSON('/api/execute', payload);
      if (data?.circuit) {
        setCircuit(data.circuit);
        onCircuitChange?.(data.circuit);
      }
      if (data?.reducedStates) {
        setResults(data.reducedStates);
        onResultsChange?.(data.reducedStates);
      } else if (data?.circuit) {
        const sim = simulateCircuit(data.circuit);
        setResults(sim.reducedStates);
        onResultsChange?.(sim.reducedStates);
      }
      return data;
    } catch (err) {
      // Fallback to local simulation
      const parsed = parseQuantumCode(code);
      setCircuit(parsed);
      onCircuitChange?.(parsed);
      const sim = simulateCircuit(parsed);
      setResults(sim.reducedStates);
      onResultsChange?.(sim.reducedStates);
      return { circuit: parsed, reducedStates: sim };
    }
  };

  const apiStep = async () => {
    try {
      const data = await postJSON('/api/step', { code });
      return data; // expected: steps with bloch vectors
    } catch {
      return null;
    }
  };

  const apiSave = async () => {
    try {
      const data = await postJSON('/api/save', { code });
      return data; // { id }
    } catch {
      return null;
    }
  };

  const apiLoadById = async (id: string) => {
    try {
      const res = await fetch(`/api/load?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return null;
    }
  };

  const apiShare = async () => {
    try {
      const data = await postJSON('/api/share', { code });
      return data; // { url }
    } catch {
      return null;
    }
  };

  const apiReduced = async () => {
    try {
      const data = await postJSON('/api/reduced', { code });
      return data; // { reducedStates }
    } catch {
      return null;
    }
  };

  // Handle code changes with real-time parsing
  const handleCodeChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    // Validate code and provide suggestions
    const validationErrors = validateQuantumCode(newCode);
    setErrors(validationErrors);
    setSuggestions(suggestFixes(newCode));

    // Parse circuit if no errors
    if (validationErrors.length === 0) {
      try {
        const parsedCircuit = parseQuantumCode(newCode);
        setCircuit(parsedCircuit);
        onCircuitChange?.(parsedCircuit);

        // Auto-simulate if circuit is valid and has gates
        if (parsedCircuit.gates.length > 0) {
          const sim = simulateCircuit(parsedCircuit);
          setResults(sim.reducedStates);
          onResultsChange?.(sim.reducedStates);
        }
      } catch (error) {
        console.warn('Failed to parse circuit:', error);
        setCircuit(null);
        setResults([]);
        onResultsChange?.([]);
      }
    } else {
      // Clear circuit and results if there are validation errors
      setCircuit(null);
      setResults([]);
      onResultsChange?.([]);
    }
  }, [onCircuitChange, onResultsChange]);

  // Execute quantum code locally (uses REST fallback)
  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const data = await apiExecute();
      toast.success('Execution complete');
    } catch (error) {
      toast.error('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Execute on IBM Quantum
  const handleExecuteOnIBM = async () => {
    if (!circuit) {
      toast.error('No circuit to execute');
      return;
    }

    if (!isIBMConnected) {
      toast.error('Please connect to IBM Quantum first');
      return;
    }

    try {
      // Prepare circuit for IBM submission
      const circuitData = {
        numQubits: circuit.numQubits,
        gates: circuit.gates.map(gate => ({
          name: gate.name,
          qubits: gate.qubits,
          parameters: Object.values(gate.parameters || {})
        }))
      };

      await submitJob(circuitData);
      toast.success('Job submitted to IBM Quantum');
    } catch (error) {
      console.error('IBM Submission Error:', error);
      toast.error('Failed to submit job to IBM Quantum');
    }
  };

  // Step-by-step execution
  const handleStepExecution = async () => {
    if (!code.trim()) {
      toast.error('No code to execute');
      return;
    }
    const stepData = await apiStep();
    if (!stepData) {
      // Use local stepper UI if backend not available
      setShowStepByStep(true);
      setExecutionStep(0);
      toast('Step-by-step (local) initialized');
      return;
    }
    // If backend provided steps, you could pass them down to StepByStepExecution via props extension.
    setShowStepByStep(true);
  };

  // Format code (unchanged)
  const handleFormatCode = () => {
    try {
      const formatted = beautify.js(code, { indent_size: 2, space_in_empty_paren: true, preserve_newlines: true, max_preserve_newlines: 2 });
      setCode(formatted);
      toast.success('Code formatted successfully');
    } catch (error) {
      toast.error('Failed to format code');
    }
  };

  // Export circuit diagram (unchanged)
  const handleExportCircuit = async (format: 'png' | 'svg' | 'pdf') => {
    if (!circuitRef.current) {
      toast.error('No circuit diagram to export');
      return;
    }

    try {
      if (format === 'png') {
        const canvas = await html2canvas(circuitRef.current, {
          backgroundColor: null,
          scale: 2
        });
        const link = document.createElement('a');
        link.download = `quantum_circuit_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else if (format === 'svg') {
        // For SVG export, we'll use the circuit diagram's SVG directly
        const svgElement = circuitRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `quantum_circuit_${Date.now()}.svg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      } else if (format === 'pdf') {
        const canvas = await html2canvas(circuitRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`quantum_circuit_${Date.now()}.pdf`);
      }
      toast.success(`Circuit diagram exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export circuit as ${format.toUpperCase()}`);
    }
  };

  // QASM helpers, Save/Load/Share handlers (reuse existing implementations)
  const qasmFromCircuit = (qc: QuantumCircuit): string => {
    let qasm = `OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[${qc.numQubits}];\n`;
    qc.gates.forEach(g => {
      const n = g.name.toUpperCase();
      if (g.qubits.length === 1) {
        qasm += `${n.toLowerCase()} q[${g.qubits[0]}];\n`;
      } else if (n === 'CNOT' && g.qubits.length === 2) {
        qasm += `cx q[${g.qubits[0]}],q[${g.qubits[1]}];\n`;
      } else if (n === 'CZ' && g.qubits.length === 2) {
        qasm += `cz q[${g.qubits[0]}],q[${g.qubits[1]}];\n`;
      } else if (n === 'SWAP' && g.qubits.length === 2) {
        qasm += `swap q[${g.qubits[0]}],q[${g.qubits[1]}];\n`;
      }
    });
    return qasm;
  };

  const parseOpenQASM = (text: string): QuantumCircuit | null => {
    try {
      const qregMatch = text.match(/qreg\s+q\[(\d+)\]/);
      const numQ = qregMatch ? parseInt(qregMatch[1]) : 2;
      const lines = text.split(/\r?\n/);
      const gates: { name: string; qubits: number[] }[] = [];
      lines.forEach(l => {
        const t = l.trim();
        let m;
        if ((m = t.match(/^h\s+q\[(\d+)\];/))) gates.push({ name: 'H', qubits: [parseInt(m[1])] });
        else if ((m = t.match(/^x\s+q\[(\d+)\];/))) gates.push({ name: 'X', qubits: [parseInt(m[1])] });
        else if ((m = t.match(/^y\s+q\[(\d+)\];/))) gates.push({ name: 'Y', qubits: [parseInt(m[1])] });
        else if ((m = t.match(/^z\s+q\[(\d+)\];/))) gates.push({ name: 'Z', qubits: [parseInt(m[1])] });
        else if ((m = t.match(/^cx\s+q\[(\d+)\],q\[(\d+)\];/))) gates.push({ name: 'CNOT', qubits: [parseInt(m[1]), parseInt(m[2])] });
        else if ((m = t.match(/^cz\s+q\[(\d+)\],q\[(\d+)\];/))) gates.push({ name: 'CZ', qubits: [parseInt(m[1]), parseInt(m[2])] });
        else if ((m = t.match(/^swap\s+q\[(\d+)\],q\[(\d+)\];/))) gates.push({ name: 'SWAP', qubits: [parseInt(m[1]), parseInt(m[2])] });
      });
      return { numQubits: numQ, gates } as QuantumCircuit;
    } catch {
      return null;
    }
  };

  // Save project (localStorage + optional JSON/QASM download)
  const handleSaveProject = async () => {
    const project = {
      code,
      circuit,
      results,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Save to localStorage list
    try {
      const listKey = 'quantumProjects';
      const list = JSON.parse(localStorage.getItem(listKey) || '[]');
      const id = `proj_${Date.now()}`;
      list.unshift({ id, name: id, createdAt: project.timestamp });
      localStorage.setItem(listKey, JSON.stringify(list));
      localStorage.setItem(id, JSON.stringify(project));
    } catch { }

    // Ask to download JSON/QASM
    const choice = window.prompt('Download format? Enter json, qasm, both, or cancel', 'json');
    if (choice && choice.toLowerCase() !== 'cancel') {
      if (choice.includes('json')) {
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `quantum_project_${Date.now()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
      if (choice.includes('qasm') && circuit) {
        const qasm = qasmFromCircuit(circuit);
        const blob = new Blob([qasm], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `quantum_circuit_${Date.now()}.qasm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }

    toast.success('Project saved successfully');
  };

  // Share project
  const handleShareProject = async () => {
    const project = {
      code,
      circuit,
      timestamp: new Date().toISOString()
    };

    const data = btoa(unescape(encodeURIComponent(JSON.stringify(project))));
    const shareUrl = `${window.location.origin}${window.location.pathname}#project=${data}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Shareable link copied to clipboard');
    } catch {
      toast.success('Unable to copy link. Downloading JSON instead.');
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `quantum_project_${Date.now()}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Load project from localStorage
  const handleLoadFromStorage = (id: string) => {
    try {
      const raw = localStorage.getItem(id);
      if (!raw) {
        toast.error('Saved project not found');
        return;
      }
      const data = JSON.parse(raw);
      if (data.code) setCode(data.code);
      if (data.circuit) {
        setCircuit(data.circuit);
        onCircuitChange?.(data.circuit);
      }
      if (data.results) {
        setResults(data.results);
        onResultsChange?.(data.results);
      }
      toast.success('Project loaded from storage');
    } catch {
      toast.error('Failed to load project');
    }
  };

  // Reduced states via REST or local
  const handleComputeReduced = async () => {
    if (!code.trim()) {
      toast.error('No code to execute');
      return;
    }
    setIsComputingReduced(true);
    try {
      // Try API first if available
      if (typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/reduced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.circuit) {
              setCircuit(data.circuit);
              onCircuitChange?.(data.circuit);
            }
            if (data?.reducedStates) {
              setResults(data.reducedStates);
              onResultsChange?.(data.reducedStates);
              toast.success('Reduced states computed');
              return;
            }
          }
        } catch { }
      }
      // Fallback to local
      const parsed = parseQuantumCode(code);
      setCircuit(parsed);
      onCircuitChange?.(parsed);
      const sim = simulateCircuit(parsed);
      setResults(sim.reducedStates);
      onResultsChange?.(sim.reducedStates);
      toast.success('Reduced states computed (local)');
    } catch (e) {
      toast.error('Failed to compute reduced states');
    } finally {
      setIsComputingReduced(false);
    }
  };

  // Load via file input: update filename
  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        if (file.name.toLowerCase().endsWith('.qasm')) {
          const qc = parseOpenQASM(text);
          if (qc) {
            setCircuit(qc);
            onCircuitChange?.(qc);
            setCode(qasmFromCircuit(qc));
            toast.success('QASM loaded');
          } else {
            toast.error('Unsupported or invalid QASM');
          }
          return;
        }
        const data = JSON.parse(text);
        if (data.code) setCode(data.code);
        if (data.circuit) {
          setCircuit(data.circuit);
          onCircuitChange?.(data.circuit);
        }
        if (data.results) {
          setResults(data.results);
          onResultsChange?.(data.results);
        }
        toast.success('Project loaded');
      } catch (err) {
        toast.error('Invalid project file');
      }
    };
    reader.readAsText(file);
  };

  // Trigger hidden file input click for loading projects
  const handleLoadProjectClick = () => {
    try {
      fileInputRef.current?.click();
    } catch { }
  };

  const handleDownloadPanelPng = async (index: number) => {
    try {
      const el = analysisRefs.current[index];
      if (!el) return;
      const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#0b0b0f', scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qubit_${index}_analysis.png`;
      a.click();
    } catch { }
  };

  const handleDownloadPanelPdf = async (index: number) => {
    try {
      const el = analysisRefs.current[index];
      if (!el) return;
      const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#0b0b0f', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.setFontSize(14);
      pdf.text(`Quantum State Analysis - Qubit ${index}`, 40, 40);
      pdf.addImage(imgData, 'PNG', 40, 60, imgWidth, imgHeight);
      pdf.save(`qubit_${index}_analysis.pdf`);
    } catch { }
  };

  // Load sample into editor
  const handleSampleSelect = (value: string) => {
    setSelectedSample(value);
    const sample = sampleCircuits[value];
    if (sample) {
      setCode(sample);
      toast.success(`${value} loaded into editor`);
      // Trigger parse immediately
      try {
        const parsedCircuit = parseQuantumCode(sample);
        setCircuit(parsedCircuit);
        onCircuitChange?.(parsedCircuit);
      } catch { }
    }
  };

  // Insert a QASM template by name
  const handleInsertQasmTemplate = (value: string) => {
    const qasm = qasmTemplates[value];
    if (qasm) {
      setCode(qasm);
      toast.success(`${value} template inserted`);
      try {
        const parsedCircuit = parseQuantumCode(qasm);
        setCircuit(parsedCircuit);
        onCircuitChange?.(parsedCircuit);
      } catch { }
    }
  };

  // Theme and fix handler (unchanged)
  useEffect(() => {
    const theme = document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light';
    setEditorTheme(theme);
    // Wire up global fix applier once
    const handler = (e: any) => {
      if (!editorRef.current || !monacoRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;
      const { startLine, startColumn, endLine, endColumn, replacement } = e.detail;
      const range = new monacoRef.current.Range(startLine, startColumn, endLine, endColumn);
      const id = { major: 1, minor: 1 };
      const text = replacement;
      const op = { identifier: id, range, text, forceMoveMarkers: true };
      model.pushEditOperations([], [op], () => null);
      editorRef.current.focus();
    };
    window.addEventListener('quantum-apply-fix', handler);
    return () => window.removeEventListener('quantum-apply-fix', handler);
  }, []);

  // Pull projects list from storage
  const savedList = (() => {
    try {
      return JSON.parse(localStorage.getItem('quantumProjects') || '[]') as { id: string; name: string }[];
    } catch {
      return [] as { id: string; name: string }[];
    }
  })();

  return (
    <div className="space-y-6">
      {/* Top tools retained for convenience (optional) */}
      {/* Code Editor card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Quantum Code Editor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select onValueChange={handleSampleSelect}>
                <SelectTrigger className="w-64 bg-input border-primary/20">
                  <SelectValue placeholder="Example Circuits" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(sampleCircuits).map((name) => (
                    <SelectItem key={name} value={name} className="px-3 py-2">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFormatCode}
                className="text-xs"
                aria-label="Format code"
                data-testid="btn-format"
                title="Format code"
              >
                Format
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error area and Monaco editor (unchanged) */}
          {/* Error Display */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      {errors.map((error, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-semibold">Line {error.line}:</span> {error.message}
                        </div>
                      ))}
                      {suggestions.length > 0 && (
                        <div className="mt-2">
                          <div className="font-semibold mb-1">Suggestions:</div>
                          <div className="space-y-2">
                            {suggestions.map((sug, idx) => (
                              <div key={idx} className="p-2 rounded border border-muted/30 bg-muted/10">
                                <div className="text-sm"><span className="font-semibold">Line {sug.line}:</span> {sug.message}</div>
                                {sug.fixes.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {sug.fixes.map((fix, fIdx) => (
                                      <Button
                                        key={fIdx}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => applyFix(fix)}
                                      >
                                        Fix: {fix.description}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monaco Editor */}
          <div className="border border-primary/20 rounded-lg overflow-hidden">
            <Editor
              height="400px"
              language="python"
              theme={editorTheme}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                editor.focus();
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                hover: { enabled: true }
              }}
            />
          </div>

          {/* Footer Controls inside the same card */}
          <div className="mt-4">
            <Button
              variant="default"
              onClick={handleComputeReduced}
              disabled={isComputingReduced || errors.length > 0}
              className="w-full h-11 text-base shadow-md"
              aria-label="Compute reduced states"
              data-testid="btn-compute-reduced"
              title="Compute reduced density matrices for each qubit"
            >
              {isComputingReduced ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {isComputingReduced ? 'Computing…' : 'Compute Reduced States'}
            </Button>

            <div className="mt-4 space-y-3">
              {/* Row 1: Execute + Execute on IBM + Step-by-Step */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting || errors.length > 0}
                  aria-label="Execute circuit"
                  data-testid="btn-execute"
                  title="Execute the circuit and update diagram and results"
                  className="h-9 px-3 bg-gradient-sphere text-primary-foreground shadow hover:brightness-110 active:brightness-95"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Execute Circuit (Local)
                </Button>

                {isIBMConnected && (
                  <Button
                    variant="outline"
                    onClick={handleExecuteOnIBM}
                    disabled={!circuit || currentJob?.status === 'running' || currentJob?.status === 'queued'}
                    aria-label="Execute on IBM Quantum"
                    data-testid="btn-execute-ibm"
                    title="Submit job to IBM Quantum"
                    className="h-9 px-3 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/30"
                  >
                    {currentJob?.status === 'running' || currentJob?.status === 'queued' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {currentJob?.status === 'running' ? 'Running...' : 'Queued...'}
                      </>
                    ) : (
                      <>
                        <Earth className="w-4 h-4 mr-2" />
                        Execute on IBM
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleStepExecution}
                  disabled={isStepping || errors.length > 0}
                  aria-label="Step-by-step execution"
                  data-testid="btn-step"
                  title="Run gate-by-gate and view intermediate states"
                  className="h-9 px-3"
                >
                  {isStepping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <StepForward className="w-4 h-4 mr-2" />}
                  Step-by-Step
                </Button>
              </div>

              {/* Row 2: Save + Load + Share */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={async () => { setIsSaving(true); try { await handleSaveProject(); toast.success('Saved'); } catch { toast.error('Save failed'); } finally { setIsSaving(false); } }}
                  disabled={isSaving}
                  aria-label="Save circuit"
                  data-testid="btn-save"
                  title="Save this circuit"
                  className="h-9 px-3"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.qasm,application/json,text/plain"
                  className="hidden"
                  aria-label="Load circuit file"
                  title="Load a saved JSON or QASM file"
                  placeholder="Choose a circuit file"
                  onChange={handleLoadProject}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Load circuit"
                  data-testid="btn-load"
                  title="Load a saved JSON/QASM file"
                  className="h-9 px-3"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Load
                </Button>

                <Button
                  variant="ghost"
                  onClick={async () => { setIsSharing(true); try { await handleShareProject(); toast.success('Share link created'); } catch { toast.error('Share failed'); } finally { setIsSharing(false); } }}
                  disabled={isSharing}
                  aria-label="Share circuit"
                  data-testid="btn-share"
                  title="Create a public share link"
                  className="h-9 px-3"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                  Share
                </Button>
              </div>
            </div>

            {loadedFileName && (
              <div className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                Loaded file: {loadedFileName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note: Removed duplicate sticky bottom control bar to avoid repeated controls */}

      {/* Full layout content (diagram/results) remains for layoutMode === 'full' */}
      {layoutMode === 'full' && (
        <>
          {/* Circuit Visualization and Results */}
          <AnimatePresence>
            {circuit && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Circuit Diagram */}
                <Card className="border-accent/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-accent">
                        <CircuitBoard className="w-5 h-5" />
                        Circuit Diagram
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCircuit('png')}
                        >
                          <Image className="w-4 h-4 mr-1" />
                          PNG
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCircuit('svg')}
                        >
                          <FileImage className="w-4 h-4 mr-1" />
                          SVG
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCircuit('pdf')}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div ref={circuitRef}>
                      <CircuitDiagram circuit={circuit} />
                    </div>
                  </CardContent>
                </Card>

                {/* Step-by-Step Execution */}
                {showStepByStep && (
                  <StepByStepExecution
                    circuit={circuit}
                    onClose={() => setShowStepByStep(false)}
                  />
                )}

                {/* Results Tabs */}
                {results.length > 0 && (
                  <Tabs defaultValue="states" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/30 p-1 rounded-lg">
                      <TabsTrigger value="states" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                        Qubit States
                      </TabsTrigger>
                      <TabsTrigger value="table" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                        State Table
                      </TabsTrigger>
                      <TabsTrigger value="analysis" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                        Analysis
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="states" className="space-y-4">
                      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {results.map((state, index) => (
                          <Card key={index} ref={(el) => (analysisRefs.current[index] = el)} className="border-primary/20">
                            <CardHeader className="pb-4 border-b border-border/20">
                              <CardTitle className="text-center text-primary text-lg font-semibold">Qubit {index}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8 p-6">
                              {/* Bloch sphere with optimal web viewing size */}
                              <div className="h-80 w-full flex justify-center bg-gray-900/80 border border-border/30 rounded-lg p-3">
                                <BlochSphere3D
                                  vector={state.blochVector}
                                  purity={state.purity}
                                  size={380}
                                  showAxes={true}
                                  showGrid={true}
                                  interactive={true}
                                />
                              </div>

                              {/* Analysis Panel */}
                              <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 rounded-lg bg-muted/20 text-center font-medium">X: {state.blochVector.x.toFixed(3)}</div>
                                  <div className="p-3 rounded-lg bg-muted/20 text-center font-medium">Y: {state.blochVector.y.toFixed(3)}</div>
                                  <div className="p-3 rounded-lg bg-muted/20 text-center font-medium">Z: {state.blochVector.z.toFixed(3)}</div>
                                </div>

                                {(() => {
                                  // Helper to safely get real part
                                  const getReal = (v: any) => (typeof v === 'object' && v !== null && 'real' in v) ? v.real : Number(v);
                                  // Helper to format complex number
                                  const formatComplexValue = (v: any) => {
                                    if (typeof v === 'number') return v.toFixed(3);
                                    if (typeof v === 'object' && v !== null && 'real' in v && 'imag' in v) {
                                      const sign = v.imag >= 0 ? '+' : '-';
                                      return `${v.real.toFixed(3)} ${sign} ${Math.abs(v.imag).toFixed(3)}i`;
                                    }
                                    return String(v);
                                  };

                                  const prob0 = getReal(state.matrix[0][0]);
                                  const prob1 = getReal(state.matrix[1][1]);
                                  const alphaMag = Math.sqrt(Math.max(prob0, 0));
                                  const betaMag = Math.sqrt(Math.max(prob1, 0));

                                  // Safe phase calculation
                                  const rho01 = state.matrix[0][1];
                                  const rho01Real = getReal(rho01);
                                  const rho01Imag = (typeof rho01 === 'object' && rho01 !== null && 'imag' in rho01) ? (rho01 as any).imag : 0;
                                  // Phase of off-diagonal term (coherence) typically relates to relative phase
                                  const phase = Math.atan2(rho01Imag, rho01Real);

                                  return (
                                    <>
                                      {/* Superposition */}
                                      <div className="space-y-2">
                                        <div className="font-semibold text-accent">Superposition</div>
                                        <div className="font-mono text-xs space-y-1 bg-muted/20 rounded p-2">
                                          <div>|ψ⟩ = α|0⟩ + β|1⟩</div>
                                          <div>α ≈ {alphaMag.toFixed(3)}</div>
                                          <div>β ≈ {betaMag.toFixed(3)}</div>
                                          <div>phase φ ≈ {isFinite(phase) ? phase.toFixed(3) : '0.000'} rad</div>
                                        </div>
                                      </div>

                                      {/* Probabilities */}
                                      <div className="space-y-2">
                                        <div className="font-semibold text-accent">Probability Amplitudes</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="p-2 rounded bg-muted/20">|0⟩: {Math.sqrt(Math.max(prob0, 0)).toFixed(3)}</div>
                                          <div className="p-2 rounded bg-muted/20">|1⟩: {Math.sqrt(Math.max(prob1, 0)).toFixed(3)}</div>
                                        </div>
                                      </div>

                                      {/* Reduced density matrix formatted */}
                                      <div className="space-y-2">
                                        <div className="font-semibold text-accent">Reduced Density Matrix</div>
                                        <div className="rounded bg-muted/20 p-3 font-mono text-xs inline-block">
                                          <div className="flex items-start gap-3">
                                            <span>[</span>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                              <div>{formatComplexValue(state.matrix[0][0])}</div>
                                              <div>{formatComplexValue(state.matrix[0][1])}</div>
                                              <div>{formatComplexValue(state.matrix[1][0])}</div>
                                              <div>{formatComplexValue(state.matrix[1][1])}</div>
                                            </div>
                                            <span>]</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Entanglement */}
                                      <div className="space-y-2">
                                        <div className="font-semibold text-accent">Entanglement</div>
                                        <div className="p-2 rounded bg-muted/20">
                                          {circuit && circuit.numQubits > 1
                                            ? `Estimated measure: ${(state.entanglement ?? 0).toFixed(3)}`
                                            : 'No entanglement detected.'}
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Export buttons with optimal web layout */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border/20">
                                <Button
                                  variant="outline"
                                  onClick={() => handleDownloadPanelPng(index)}
                                  className="bg-gradient-quantum border-primary/30 hover:bg-gradient-quantum/80 transition-all duration-200"
                                >
                                  <Download className="w-4 h-4 mr-2" /> PNG Export
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDownloadPanelPdf(index)}
                                  className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-primary/30 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-pink-500/30 transition-all duration-200"
                                >
                                  <Download className="w-4 h-4 mr-2" /> PDF Export
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="table">
                      <QubitStateTable results={results} />
                    </TabsContent>

                    <TabsContent value="analysis">
                      <Card className="border-primary/20">
                        <CardHeader>
                          <CardTitle>Circuit Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Circuit Properties</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Total Qubits:</span>
                                  <Badge variant="outline">{circuit.numQubits}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Gates:</span>
                                  <Badge variant="outline">{circuit.gates.length}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Circuit Depth:</span>
                                  <Badge variant="outline">{circuit.gates.length}</Badge>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">State Properties</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Avg Purity:</span>
                                  <Badge variant="outline">
                                    {(results.reduce((sum, s) => sum + s.purity, 0) / results.length).toFixed(3)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Max Superposition:</span>
                                  <Badge variant="outline">
                                    {Math.max(...results.map(s => s.superposition || 0)).toFixed(3)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}

                {/* IBM Quantum Hardware Results Panel */}
                {(currentJob?.results || currentJob?.status) && (
                  <Card className="border-indigo-500/30 bg-indigo-500/5 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-indigo-400">
                          <Activity className="w-5 h-5" />
                          IBM Quantum Hardware Results
                        </CardTitle>
                        {currentJob?.status && (
                          <Badge variant="outline" className="border-indigo-500/50 text-indigo-400">
                            {currentJob.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Timeline Section */}
                      {currentJob?.timeline && (
                        <div className="bg-slate-900/40 rounded-xl p-6 border border-white/5 shadow-inner mb-6">
                          <h4 className="text-xs font-bold text-indigo-400/70 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Status Timeline
                          </h4>
                          <div className="relative pl-8 space-y-8">
                            {/* Vertical Connecting Line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/50 via-purple-500/50 to-slate-700" />

                            {currentJob.timeline.map((event, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex items-start group"
                              >
                                {/* Status Icon */}
                                <div className="absolute -left-[32px] top-0.5 flex items-center justify-center">
                                  <div className="bg-slate-950 rounded-full p-0.5">
                                    {event.completed ? (
                                      <div className="bg-green-500/20 rounded-full p-1 animate-in zoom-in duration-300">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      </div>
                                    ) : event.active ? (
                                      <div className="bg-indigo-500/20 rounded-full p-1 ring-2 ring-indigo-500/20 ring-offset-0">
                                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                      </div>
                                    ) : (
                                      <div className="bg-slate-800 rounded-full p-1 opacity-40">
                                        <Circle className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Event Details */}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-sm font-semibold tracking-tight transition-colors ${event.active ? 'text-indigo-400' : event.completed ? 'text-slate-100' : 'text-slate-500'}`}>
                                      {event.label}
                                    </span>
                                    {event.timestamp && (
                                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                        {event.timestamp}
                                      </span>
                                    )}
                                  </div>
                                  {(event.description || (event.active && !event.completed)) && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="overflow-hidden"
                                    >
                                      <p className="text-xs text-slate-400/80 mt-1 font-medium leading-relaxed">
                                        {event.description || (event.active ? 'Processing on IBM servers...' : '')}
                                      </p>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentJob?.results ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(currentJob.results).map(([state, probability]) => (
                            <div key={state} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-900/50 border border-indigo-500/10 shadow-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-sm font-bold text-indigo-300">|{state}⟩</span>
                                <span className="text-xs font-mono text-indigo-400">{(Number(probability) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Number(probability) * 100}%` }}
                                  transition={{ duration: 1, ease: 'easeOut' }}
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                          <div className="p-4 rounded-full bg-indigo-500/10 animate-pulse">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-300">Job is currently {currentJob?.status?.toLowerCase() || 'processing'}</p>
                            <p className="text-xs text-slate-500 mt-1">Results will appear here automatically when the job completes.</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved projects quick-load */}
          {savedList.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Load saved:</label>
              <Select onValueChange={handleLoadFromStorage}>
                <SelectTrigger className="w-64 bg-input border-primary/20">
                  <SelectValue placeholder="Select a saved project" />
                </SelectTrigger>
                <SelectContent>
                  {savedList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CodeEditor;

// Apply fix into the Monaco editor/model
function applyFix(fix: { startLine: number; startColumn: number; endLine: number; endColumn: number; replacement: string }) {
  try {
    // use global monaco/editor from the mounted refs via window dispatch
    const evt = new CustomEvent('quantum-apply-fix', { detail: fix });
    window.dispatchEvent(evt);
  } catch { }
}
