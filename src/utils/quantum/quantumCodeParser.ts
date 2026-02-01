// Utilities to validate/parse Qiskit/Cirq/JSON code into a QuantumCircuit
// and drive simulations and step-by-step execution using existing simulator


import {
  simulateCircuit as simulateWithEngine,
  type QuantumCircuit as EngineQuantumCircuit,
  type DensityMatrix as EngineDensityMatrix,
  EXAMPLE_CIRCUITS,
  createInitialState,
  applyGate,
  partialTrace
} from './quantumSimulation';

export type DensityMatrix = EngineDensityMatrix;

export type QuantumCircuit = EngineQuantumCircuit;

export interface CodeError {
  line: number;
  message: string;
}

export interface Fixit {
  description: string;
  startLine: number; // 1-based
  startColumn: number; // 1-based
  endLine: number; // 1-based
  endColumn: number; // 1-based
  replacement: string;
}

export interface CodeSuggestion {
  line: number;
  message: string;
  fixes: Fixit[];
}

export interface StepResult {
  gateName?: string;
  qubits: number[];
  states: DensityMatrix[];
}

const gateNameMap: Record<string, string> = {
  h: 'H',
  x: 'X',
  y: 'Y',
  z: 'Z',
  s: 'S',
  t: 'T',
  rx: 'RX',
  ry: 'RY',
  rz: 'RZ',
  cx: 'CNOT',
  cnot: 'CNOT',
  cz: 'CZ',
  swap: 'SWAP'
};

export const validateQuantumCode = (code: string): CodeError[] => {
  const errors: CodeError[] = [];
  if (!code.trim()) return errors;
  const lines = code.split(/\r?\n/);
  // Basic sanity: ensure code has recognizable tokens for any of JSON/Qiskit/Cirq
  const isJSON = code.trim().startsWith('{');
  const looksPython = /(QuantumCircuit|cirq\.|circuit\.|qc\.|measure)/.test(code);
  const looksQasm = /^OPENQASM\s+2\.0;/.test(code.trim()) || /\bqreg\s+q\[\d+\]/.test(code);
  if (!isJSON && !looksPython && !looksQasm) {
    errors.push({ line: 1, message: 'Unrecognized format. Use JSON, Qiskit, Cirq, or OpenQASM 2.0.' });
  }
  // Try JSON parse if JSON
  if (isJSON) {
    try {
      const parsed = JSON.parse(code);
      if (typeof parsed.numQubits !== 'number' || !Array.isArray(parsed.gates)) {
        errors.push({ line: 1, message: 'JSON must have numQubits:number and gates:[]' });
      }
    } catch (e) {
      errors.push({ line: 1, message: 'Invalid JSON syntax' });
    }
  } else if (!looksQasm) {
    // Light-weight Python scan to highlight obvious syntax issues
    lines.forEach((l, i) => {
      if (/qc\.[a-zA-Z]+\(/.test(l) || /circuit\.append\(/.test(l)) {
        if (!/[)]\s*$/.test(l.trim())) {
          errors.push({ line: i + 1, message: 'Missing closing parenthesis' });
        }
      }
    });
    // Simple bracket balance check
    let open = 0;
    lines.forEach((l, i) => {
      for (const ch of l) {
        if (ch === '(') open++;
        if (ch === ')') open--;
      }
      if (open < 0) {
        errors.push({ line: i + 1, message: 'Unexpected closing parenthesis' });
        open = 0;
      }
    });
    if (open > 0) {
      errors.push({ line: Math.max(1, lines.length), message: 'Unclosed parenthesis detected' });
    }
  }
  return errors;
};

export const parseQuantumCode = (code: string): QuantumCircuit => {
  console.log('parseQuantumCode called with code:', code);
  const trimmed = code.trim();
  if (!trimmed) {
    console.log('parseQuantumCode: empty code, returning default');
    return { numQubits: 1, gates: [] };
  }
  // OpenQASM support
  if (/^OPENQASM\s+2\.0;/.test(trimmed) || /\bqreg\s+q\[\d+\]/.test(trimmed)) {
    console.log('parseQuantumCode: detected OpenQASM');
    const qc = parseOpenQASM(trimmed);
    if (qc) {
      console.log('parseQuantumCode: OpenQASM parsed successfully:', qc);
      return qc;
    } else {
      console.log('parseQuantumCode: OpenQASM parse failed');
    }
  }
  if (trimmed.startsWith('{')) {
    console.log('parseQuantumCode: detected JSON');
    try {
      const obj = JSON.parse(trimmed);
      console.log('parseQuantumCode: JSON parsed successfully:', obj);
      return obj as QuantumCircuit;
    } catch (e) {
      console.error('parseQuantumCode: JSON parse error:', e);
      throw e;
    }
  }
  // Try Qiskit first
  if (/QuantumCircuit|qc\./.test(code)) {
    console.log('parseQuantumCode: trying Qiskit parser');
    const result = parseQiskit(code);
    console.log('parseQuantumCode: Qiskit parsed result:', result);
    return result;
  }
  // Try Cirq
  if (/cirq\.|circuit\./.test(code)) {
    console.log('parseQuantumCode: trying Cirq parser');
    const result = parseCirq(code);
    console.log('parseQuantumCode: Cirq parsed result:', result);
    return result;
  }
  console.log('parseQuantumCode: no parser matched, returning default');
  // Fallback empty
  return { numQubits: 1, gates: [] };
};

const parseQiskit = (code: string): QuantumCircuit => {
  // Detect number of qubits
  // Patterns: QuantumRegister(n, 'q') or QuantumCircuit(n) or qc = QuantumCircuit(n)
  let numQubits = 0;
  const regMatch = code.match(/QuantumRegister\((\d+)/);
  const circMatch = code.match(/QuantumCircuit\((\d+)/);
  if (regMatch) numQubits = Math.max(numQubits, parseInt(regMatch[1]));
  if (circMatch) numQubits = Math.max(numQubits, parseInt(circMatch[1]));
  if (numQubits === 0) {
    // Try measure_all or default to 2
    numQubits = /range\((\d+)\)/.test(code) ? parseInt(RegExp.$1) : 2;
  }
  const gates: QuantumCircuit['gates'] = [];
  const lines = code.split(/\r?\n/);
  lines.forEach((line) => {
    const l = line.trim();
    // qc.h(0)
    const call = l.match(/qc\.(\w+)\(([^)]*)\)/);
    if (call) {
      const nameRaw = call[1].toLowerCase();
      const mapped = gateNameMap[nameRaw];
      if (!mapped) return;
      const args = call[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s.replace(/[^0-9]/g, '')))
        .filter((n) => !isNaN(n));
      if (args.length >= 1) {
        gates.push({ name: mapped, qubits: args.slice(0, mapped === 'CNOT' || mapped === 'CZ' || mapped === 'SWAP' ? 2 : 1) });
      }
    }
  });
  return { numQubits, gates };
};

const parseCirq = (code: string): QuantumCircuit => {
  // Map qubit identifiers to indices from declarations like: q0, q1 = cirq.LineQubit.range(2)
  let numQubits = 0;
  const rangeMatch = code.match(/LineQubit\.range\((\d+)\)/);
  if (rangeMatch) numQubits = parseInt(rangeMatch[1]);
  if (numQubits === 0) numQubits = 2;
  const varToIndex: Record<string, number> = {};
  const varDecl = code.match(/([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*))*\s*=\s*cirq\.LineQubit\.range\((\d+)\)/);
  if (varDecl) {
    const namesPart = varDecl[0].split('=')[0];
    const names = namesPart.split(',').map((s) => s.trim()).filter(Boolean);
    names.forEach((name, idx) => {
      varToIndex[name] = idx;
    });
  }
  const gates: QuantumCircuit['gates'] = [];
  const lines = code.split(/\r?\n/);
  lines.forEach((line) => {
    const l = line.trim();
    // circuit.append(cirq.H(q0)) or circuit.append(cirq.CNOT(q0, q1))
    const call = l.match(/circuit\.append\(cirq\.(\w+)\(([^)]*)\)\)/);
    if (call) {
      const nameRaw = call[1].toLowerCase();
      const mapped = gateNameMap[nameRaw];
      if (!mapped) return;
      const args = call[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s in varToIndex ? varToIndex[s] : parseInt(s.replace(/[^0-9]/g, ''))))
        .filter((n) => !isNaN(n));
      if (args.length >= 1) {
        gates.push({ name: mapped, qubits: args.slice(0, mapped === 'CNOT' || mapped === 'CZ' || mapped === 'SWAP' ? 2 : 1) });
      }
    }
  });
  return { numQubits, gates };
};

export const simulateCircuit = (circuit: QuantumCircuit): {
  statevector: any;
  probabilities: number[];
  densityMatrix: any;
  reducedStates: DensityMatrix[];
  error?: string;
} => {
  return simulateWithEngine(circuit);
};

// Basic OpenQASM 2.0 parser for a subset of gates used by the app
export const parseOpenQASM = (text: string): QuantumCircuit | null => {
  try {
    const qregMatch = text.match(/qreg\s+q\[(\d+)\]/);
    const numQ = qregMatch ? parseInt(qregMatch[1]) : 1;
    const lines = text.split(/\r?\n/);
    const gates: { name: string; qubits: number[] }[] = [];
    lines.forEach(l => {
      const t = l.trim().toLowerCase();
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^h\s+q\[(\d+)\];/))) gates.push({ name: 'H', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^x\s+q\[(\d+)\];/))) gates.push({ name: 'X', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^y\s+q\[(\d+)\];/))) gates.push({ name: 'Y', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^z\s+q\[(\d+)\];/))) gates.push({ name: 'Z', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^s\s+q\[(\d+)\];/))) gates.push({ name: 'S', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^t\s+q\[(\d+)\];/))) gates.push({ name: 'T', qubits: [parseInt(m[1])] });
      else if ((m = t.match(/^rx\(([^)]+)\)\s+q\[(\d+)\];/))) gates.push({ name: 'RX', qubits: [parseInt(m[2])] });
      else if ((m = t.match(/^ry\(([^)]+)\)\s+q\[(\d+)\];/))) gates.push({ name: 'RY', qubits: [parseInt(m[2])] });
      else if ((m = t.match(/^rz\(([^)]+)\)\s+q\[(\d+)\];/))) gates.push({ name: 'RZ', qubits: [parseInt(m[2])] });
      else if ((m = t.match(/^cx\s+q\[(\d+)\],\s*q\[(\d+)\];/))) gates.push({ name: 'CNOT', qubits: [parseInt(m[1]), parseInt(m[2])] });
      else if ((m = t.match(/^cz\s+q\[(\d+)\],\s*q\[(\d+)\];/))) gates.push({ name: 'CZ', qubits: [parseInt(m[1]), parseInt(m[2])] });
      else if ((m = t.match(/^swap\s+q\[(\d+)\],\s*q\[(\d+)\];/))) gates.push({ name: 'SWAP', qubits: [parseInt(m[1]), parseInt(m[2])] });
    });
    return { numQubits: numQ, gates } as QuantumCircuit;
  } catch {
    return null;
  }
};

export const simulateCircuitStepByStep = (circuit: QuantumCircuit): StepResult[] => {
  try {
    const steps: StepResult[] = [];
    let state = createInitialState(circuit.numQubits);
    // Initial state snapshot
    steps.push({ qubits: [], states: reduceAll(state, circuit.numQubits) });
    for (const gate of circuit.gates) {
      state = applyGate(state, gate as any, circuit.numQubits);
      steps.push({ gateName: gate.name, qubits: gate.qubits, states: reduceAll(state, circuit.numQubits) });
    }
    return steps;
  } catch (error) {
    console.error('Error during simulateCircuitStepByStep:', error);
    throw error;
  }
};

const reduceAll = (fullState: number[][], numQubits: number): DensityMatrix[] => {
  const reduced: DensityMatrix[] = [];
  for (let i = 0; i < numQubits; i++) {
    reduced.push(partialTrace(fullState, i, numQubits));
  }
  return reduced;
};

export { EXAMPLE_CIRCUITS };


// Provide intelligent suggestions and fix-its
export const suggestFixes = (code: string): CodeSuggestion[] => {
  const suggestions: CodeSuggestion[] = [];
  if (!code.trim()) return suggestions;
  const lines = code.split(/\r?\n/);
  const isJSON = code.trim().startsWith('{');

  // Known canonical gate names
  const knownGates = Array.from(new Set(Object.values(gateNameMap)));

  // Utility: Levenshtein distance
  const dist = (a: string, b: string): number => {
    const dp: number[][] = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
      }
    }
    return dp[a.length][b.length];
  };

  // Try to infer numQubits from parsed circuit
  let inferredQubits = 0;
  try {
    inferredQubits = parseQuantumCode(code).numQubits || 0;
  } catch { }

  if (isJSON) {
    try {
      const obj = JSON.parse(code);
      if (Array.isArray(obj?.gates)) {
        obj.gates.forEach((g: any) => {
          if (g?.name && !knownGates.includes(g.name)) {
            const best = knownGates.map(k => ({ k, d: dist(g.name.toUpperCase(), k) }))
              .sort((a, b) => a.d - b.d)[0];
            if (best && best.d <= 3) {
              const idx = lines.findIndex(ln => ln.includes('"name"') && ln.includes(g.name));
              const line = idx >= 0 ? idx + 1 : 1;
              suggestions.push({
                line,
                message: `Did you mean ${best.k}?`,
                fixes: [
                  {
                    description: `Replace gate name with ${best.k}`,
                    startLine: line,
                    startColumn: 1,
                    endLine: line,
                    endColumn: lines[line - 1]?.length ?? 1,
                    replacement: (lines[line - 1] || '').replace(g.name, best.k)
                  }
                ]
              });
            }
          }
          if (Array.isArray(g?.qubits) && inferredQubits > 0) {
            g.qubits.forEach((q: number) => {
              if (q < 0 || q >= inferredQubits) {
                const idx = lines.findIndex(ln => ln.includes('"qubits"') && ln.includes(String(q)));
                const line = idx >= 0 ? idx + 1 : 1;
                suggestions.push({
                  line,
                  message: `Qubit index exceeds available qubits. Try using 0..${inferredQubits - 1}.`,
                  fixes: []
                });
              }
            });
          }
        });
      }
    } catch { }
    return suggestions;
  }

  // Python/Qiskit/Cirq suggestions
  const hasQiskitImport = /from\s+qiskit\s+import\s+QuantumCircuit/.test(code) || /import\s+qiskit/.test(code);
  const hasCirqImport = /import\s+cirq/.test(code);
  if ((/QuantumCircuit|qc\./.test(code)) && !hasQiskitImport) {
    suggestions.push({
      line: 1,
      message: 'Missing Qiskit import. Try adding: from qiskit import QuantumCircuit',
      fixes: [
        {
          description: 'Add Qiskit import',
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 1,
          replacement: `from qiskit import QuantumCircuit\n${lines[0]}`
        }
      ]
    });
  }
  if ((/cirq\.|circuit\./.test(code)) && !hasCirqImport) {
    suggestions.push({
      line: 1,
      message: 'Missing Cirq import. Try adding: import cirq',
      fixes: [
        {
          description: 'Add Cirq import',
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 1,
          replacement: `import cirq\n${lines[0]}`
        }
      ]
    });
  }

  // Gate typos and paren fixes
  lines.forEach((l, i) => {
    const qCall = l.match(/qc\.(\w+)\(([^)]*)/);
    if (qCall) {
      const nameRaw = qCall[1];
      const mapped = gateNameMap[nameRaw.toLowerCase()];
      if (!mapped) {
        const best = knownGates.map(k => ({ k, d: dist(nameRaw.toUpperCase(), k) }))
          .sort((a, b) => a.d - b.d)[0];
        if (best && best.d <= 3) {
          const start = l.indexOf('qc.') + 3 + 1; // after 'qc.'
          suggestions.push({
            line: i + 1,
            message: `Did you mean ${best.k}?`,
            fixes: [
              {
                description: `Replace ${nameRaw} with ${best.k.toLowerCase()}`,
                startLine: i + 1,
                startColumn: start,
                endLine: i + 1,
                endColumn: start + nameRaw.length,
                replacement: best.k.toLowerCase()
              }
            ]
          });
        }
      }
      if (!l.trim().endsWith(')')) {
        suggestions.push({
          line: i + 1,
          message: 'Missing closing parenthesis.',
          fixes: [
            {
              description: 'Add ")"',
              startLine: i + 1,
              startColumn: l.length + 1,
              endLine: i + 1,
              endColumn: l.length + 1,
              replacement: ')'
            }
          ]
        });
      }
      if (inferredQubits > 0) {
        const args = (qCall[2] || '')
          .split(',')
          .map(s => parseInt(s.replace(/[^0-9]/g, '')))
          .filter(n => !isNaN(n));
        args.forEach(q => {
          if (q < 0 || q >= inferredQubits) {
            suggestions.push({
              line: i + 1,
              message: `Qubit index exceeds available qubits. Try using 0..${inferredQubits - 1}.`,
              fixes: []
            });
          }
        });
      }
    }

    const cCall = l.match(/circuit\.append\(cirq\.(\w+)\(([^)]*)/);
    if (cCall) {
      const nameRaw = cCall[1];
      const mapped = gateNameMap[nameRaw.toLowerCase()];
      if (!mapped) {
        const best = knownGates.map(k => ({ k, d: dist(nameRaw.toUpperCase(), k) }))
          .sort((a, b) => a.d - b.d)[0];
        if (best && best.d <= 3) {
          const start = l.indexOf('cirq.') + 5 + 1; // after 'cirq.'
          suggestions.push({
            line: i + 1,
            message: `Did you mean ${best.k}?`,
            fixes: [
              {
                description: `Replace ${nameRaw} with ${best.k}`,
                startLine: i + 1,
                startColumn: start,
                endLine: i + 1,
                endColumn: start + nameRaw.length,
                replacement: best.k
              }
            ]
          });
        }
      }
      if (!l.trim().endsWith('))')) {
        suggestions.push({
          line: i + 1,
          message: 'Missing closing "))".',
          fixes: [
            {
              description: 'Add "))"',
              startLine: i + 1,
              startColumn: l.length + 1,
              endLine: i + 1,
              endColumn: l.length + 1,
              replacement: '))'
            }
          ]
        });
      }
    }
  });

  return suggestions;
};

export const executeOnIBMQuantum = async (circuit: QuantumCircuit, token: string, backend: string, shots: number = 1024) => {
  try {
    const result = await quantumAPI.executeOnIBM(token, backend, circuit, shots);
    return result;
  } catch (error) {
    console.error('IBM Quantum execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute on IBM Quantum'
    };
  }
};

import { quantumAPI } from '@/services/quantumAPI';

export const monitorIBMJob = async (jobId: string, token: string) => {
  return quantumAPI.getIBMJobStatus(jobId, token);
};

export const getIBMBackends = async (token: string) => {
  const result = await quantumAPI.getIBMBackends(token);
  return result.backends || [];
};

export const validateIBMToken = async (token: string) => {
  const result = await quantumAPI.connectToIBM(token);
  return { valid: result.success, error: result.error };
};

