// Circuit Operations and Gate Application WITH COMPLEX NUMBERS
// Corrected for Quantum Phase and Multi-qubit Gates

import { GATES } from './gates';
import {
  ComplexMatrix,
  Complex,
  complex,
  multiplyComplexMatrices,
  tensorProduct,
  conjugateTranspose,
  complexToRealMatrix,
  realToComplexMatrix,
  add,
  multiply,
  conjugate
} from '../core/complex';
import { DensityMatrix, partialTrace, createInitialState, calculateBlochVector } from './densityMatrix';
import { monitoredCircuitCache, monitoredGateCache, CacheKeys } from '../cache/memory';

export interface QuantumGate {
  name: string;
  qubits: number[];
  matrix?: number[][] | ComplexMatrix | ((angle: number) => number[][]) | ((angle: number) => ComplexMatrix);
  parameters?: {
    angle?: number;
    phi?: number;
    theta?: number;
    [key: string]: any;
  };
  position?: number;
}

// Helper to Convert Inputs to ComplexMatrix
const ensureComplexMatrix = (input: number[][] | ComplexMatrix): ComplexMatrix => {
  if (!input || !Array.isArray(input)) return [[complex(0, 0)]];

  if (input.length > 0 && Array.isArray(input[0]) && typeof input[0][0] === 'object' && 'real' in input[0][0]) {
    return input as ComplexMatrix;
  }

  return realToComplexMatrix(input as number[][]);
};

export interface QuantumCircuit {
  numQubits: number;
  gates: QuantumGate[];
}

// Create initial state |00...0⟩ as Density Matrix (Complex)
const createInitialStateComplex = (numQubits: number): ComplexMatrix => {
  const dim = 1 << numQubits;
  const state: ComplexMatrix = Array(dim).fill(0).map(() => Array(dim).fill(complex(0, 0)));
  state[0][0] = complex(1, 0); // |0...0⟩⟨0...0|
  return state;
};

// Apply a gate to the quantum state (Complex Engine)
export const applyGate = (state: number[][] | ComplexMatrix, gate: QuantumGate, numQubits: number): ComplexMatrix => {
  let outputState = ensureComplexMatrix(state);

  // Validation
  if (!gate || !gate.name) return outputState;

  // Get Gate Matrix (Complex)
  let gateMatrix: ComplexMatrix | undefined;

  try {
    // 1. Check for parameterized matrix function in gate definition
    if (typeof gate.matrix === 'function') {
      // This is usually defining a real matrix in the old code, strict check needed
      // But GATES in gates.ts has complex definitions if we use GATES[name]
    }

    // 2. Use Standard GATES definition (Complex)
    const standardGate = GATES[gate.name as keyof typeof GATES];
    if (standardGate) {
      if (typeof standardGate === 'function') {
        // Parameterized
        const angle = gate.parameters?.angle ?? gate.parameters?.phi ?? Math.PI / 2;
        // The function in GATES returns ComplexMatrix
        // @ts-ignore
        gateMatrix = standardGate(angle);
      } else {
        // Constant
        gateMatrix = standardGate as ComplexMatrix;
      }
    } else if (gate.matrix && Array.isArray(gate.matrix) && !Array.isArray(gate.matrix[0])) {
      // It might be a flat array or something, ignore
    } else if (gate.matrix) {
      // Custom matrix provided in gate object
      if (typeof gate.matrix === 'function') {
        const angle = gate.parameters?.angle ?? 0;
        // @ts-ignore
        gateMatrix = ensureComplexMatrix(gate.matrix(angle));
      } else {
        gateMatrix = ensureComplexMatrix(gate.matrix as any);
      }
    }
  } catch (e) {
    console.error(`Error resolving matrix for ${gate.name}`, e);
  }

  if (!gateMatrix) return outputState;

  // Apply Gate
  try {
    if (gate.qubits.length === 1) {
      return applySingleQubitGateComplex(outputState, gateMatrix, gate.qubits[0], numQubits);
    } else if (gate.qubits.length === 2) {
      return applyTwoQubitGateComplex(outputState, gateMatrix, gate.qubits[0], gate.qubits[1], numQubits);
    } else if (gate.qubits.length === 3) {
      return applyThreeQubitGateComplex(outputState, gateMatrix, gate.qubits[0], gate.qubits[1], gate.qubits[2], numQubits);
    }
  } catch (e) {
    console.error(`Error applying gate ${gate.name}`, e);
  }

  return outputState;
};

const applySingleQubitGateComplex = (state: ComplexMatrix, gate: ComplexMatrix, qubit: number, numQubits: number): ComplexMatrix => {
  // Tensor Product: I ⊗ ... ⊗ U ⊗ ... ⊗ I

  let fullU: ComplexMatrix = [[complex(1, 0)]];
  // 2x2 Identity
  const I2: ComplexMatrix = [[complex(1, 0), complex(0, 0)], [complex(0, 0), complex(1, 0)]];

  // Assuming qubit 0 is MSB (First in tensor product)
  for (let i = 0; i < numQubits; i++) {
    fullU = tensorProduct(fullU, i === qubit ? gate : I2);
  }

  const U_rho = multiplyComplexMatrices(fullU, state);
  const rho_new = multiplyComplexMatrices(U_rho, conjugateTranspose(fullU));

  return rho_new;
};

const applyTwoQubitGateComplex = (state: ComplexMatrix, gate: ComplexMatrix, q1: number, q2: number, num: number): ComplexMatrix => {
  const dim = 1 << num;

  // Qubits must be within [0, num-1]
  if (q1 >= num || q2 >= num || q1 < 0 || q2 < 0) {
    console.error(`Invalid qubit indices for 2-qubit gate: q${q1}, q${q2} on ${num} qubits.`);
    return state;
  }

  // Initialize U with valid complex(0,0) objects immediately
  const U: ComplexMatrix = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => ({ real: 0, imag: 0 }))
  );

  for (let r = 0; r < dim; r++) {
    const shift1 = num - 1 - q1;
    const shift2 = num - 1 - q2;

    const b1 = (r >> shift1) & 1;
    const b2 = (r >> shift2) & 1;
    const inIdx = b1 * 2 + b2;

    for (let outIdx = 0; outIdx < 4; outIdx++) {
      const val = gate[outIdx][inIdx]; // Complex value
      if (Math.abs(val.real) < 1e-10 && Math.abs(val.imag) < 1e-10) continue;

      const out_b1 = (outIdx >> 1) & 1;
      const out_b2 = outIdx & 1;

      let c = r;
      c &= ~(1 << shift1);
      c &= ~(1 << shift2);
      c |= (out_b1 << shift1);
      c |= (out_b2 << shift2);

      if (U[c]) {
        U[c][r] = val;
      }
    }
  }

  const U_rho = multiplyComplexMatrices(U, state);
  return multiplyComplexMatrices(U_rho, conjugateTranspose(U));
};

const applyThreeQubitGateComplex = (state: ComplexMatrix, gate: ComplexMatrix, q1: number, q2: number, q3: number, num: number): ComplexMatrix => {
  const dim = 1 << num;

  // Qubits must be within [0, num-1]
  if (q1 >= num || q2 >= num || q3 >= num || q1 < 0 || q2 < 0 || q3 < 0) {
    console.error(`Invalid qubit indices for 3-qubit gate: q${q1}, q${q2}, q${q3} on ${num} qubits.`);
    return state;
  }

  // Initialize U with valid complex(0,0) objects immediately
  const U: ComplexMatrix = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => ({ real: 0, imag: 0 }))
  );

  for (let r = 0; r < dim; r++) {
    const shift1 = num - 1 - q1;
    const shift2 = num - 1 - q2;
    const shift3 = num - 1 - q3;

    const b1 = (r >> shift1) & 1;
    const b2 = (r >> shift2) & 1;
    const b3 = (r >> shift3) & 1;

    const inIdx = b1 * 4 + b2 * 2 + b3;

    for (let outIdx = 0; outIdx < 8; outIdx++) {
      const val = gate[outIdx][inIdx];
      if (Math.abs(val.real) < 1e-10 && Math.abs(val.imag) < 1e-10) continue;

      const out_b1 = (outIdx >> 2) & 1;
      const out_b2 = (outIdx >> 1) & 1;
      const out_b3 = outIdx & 1;

      let c = r;
      c &= ~(1 << shift1);
      c &= ~(1 << shift2);
      c &= ~(1 << shift3);

      c |= (out_b1 << shift1);
      c |= (out_b2 << shift2);
      c |= (out_b3 << shift3);

      if (U[c]) {
        U[c][r] = val;
      }
    }
  }

  const U_rho = multiplyComplexMatrices(U, state);
  return multiplyComplexMatrices(U_rho, conjugateTranspose(U));
};

// Simulate Circuit
export const simulateCircuit = (
  circuit: QuantumCircuit,
  initialState?: number[][] | string | ComplexMatrix
): {
  statevector: number[][] | ComplexMatrix;
  probabilities: number[];
  densityMatrix: number[][] | ComplexMatrix;
  reducedStates: DensityMatrix[];
  error?: string;
} => {
  try {
    const { numQubits, gates } = circuit;

    // Initialize State (Complex Density Matrix)
    let state: ComplexMatrix;

    if (initialState) {
      // Handle custom initial state if needed
      if (typeof initialState === 'string') {
        // Basic support for string state if cached or parsed
        state = createInitialStateComplex(numQubits);
      } else {
        state = ensureComplexMatrix(initialState as any);
      }
    } else {
      state = createInitialStateComplex(numQubits);
    }

    // Apply Gates
    for (const gate of gates) {
      state = applyGate(state, gate, numQubits);
    }

    // Results
    const densityMatrix = state;
    // Probabilities (diagonals)
    const probabilities: number[] = [];
    for (let i = 0; i < state.length; i++) {
      probabilities.push(state[i][i].real);
    }

    // Reduced States
    const reducedStates: DensityMatrix[] = [];
    for (let i = 0; i < numQubits; i++) {
      // @ts-ignore
      reducedStates.push(partialTrace(state, i, numQubits));
    }

    return {
      statevector: state, // Returning ComplexMatrix
      probabilities,
      densityMatrix: state,
      reducedStates
    };

  } catch (e: any) {
    return { statevector: [], probabilities: [], densityMatrix: [], reducedStates: [], error: e.message };
  }
};

// Helper for Gate Output State identifying (Ket Notation)
export const computeGateOutputState = (
  gate: QuantumGate,
  inputState: any,
  workspaceNumQubits: number
): any => {
  // Use a temporary system that matches the gate requirements
  const gateQubits = gate.qubits;
  const maxQubit = Math.max(...gateQubits, 0);
  const n = Math.max(workspaceNumQubits, maxQubit + 1, gateQubits.length);

  // Initialize state based on inputState string if possible
  // inputState is often '|0⟩', '|1⟩', '|00⟩', etc.
  let rhoInput: ComplexMatrix = createInitialStateComplex(n);

  try {
    if (typeof inputState === 'string' && inputState.startsWith('|') && inputState.endsWith('⟩')) {
      const ket = inputState.slice(1, -1);

      // Parse ket string character by character to build the tensor product state
      // Supports 0, 1, +, -, r (|+i>), l (|-i>)
      let isValidState = true;
      let partialState: ComplexMatrix = [[complex(1, 0)]]; // Start 1x1 Identity-like scalar

      // We need to parse correctly. If simple chars, split is fine.
      // But |+i> is problematic with simple split if represented as chars.
      // We'll assume the inputs from our system use single-char representations where possible
      // OR we handle the known simple cases for the user's request (H, Z, H which use +, -)
      // AND we add basic support for a format that might be used. 

      // For now, let's just handle the chars we know are generated by the workspace/builder:
      // 0, 1, +, -
      // If we encounter others, we default to 0

      const qubits = ket.split('');
      if (qubits.length === n) {
        // Reset to empty 1x1 to start tensor product accumulation
        // Actually, start with the first qubit's state

        let first = true;

        for (const char of qubits) {
          let qState: ComplexMatrix;

          if (char === '0') {
            qState = [[complex(1, 0)], [complex(0, 0)]];
          } else if (char === '1') {
            qState = [[complex(0, 0)], [complex(1, 0)]];
          } else if (char === '+') {
            // |+> = (|0> + |1>)/sqrt(2)
            const val = complex(1 / Math.sqrt(2), 0);
            qState = [[val], [val]];
          } else if (char === '-') {
            // |-> = (|0> - |1>)/sqrt(2)
            const val = complex(1 / Math.sqrt(2), 0);
            qState = [[val], [complex(-1 / Math.sqrt(2), 0)]];
          } else {
            // Fallback or handle i/j if we standardize them
            // For now, treat valid binary check as fallback
            isValidState = false;
            break;
          }

          if (first) {
            partialState = qState;
            first = false;
          } else {
            partialState = tensorProduct(partialState, qState);
          }
        }

        if (isValidState && partialState.length === (1 << n)) {
          rhoInput = Array(1 << n).fill(0).map(() => Array(1 << n).fill(complex(0, 0)));
          // partialState is column vector (Ket). We need Density Matrix |PSI><PSI|
          // But partialState from tensorProduct of column vectors IS a column vector

          // Construct Density Matrix rho = |psi><psi|
          // |psi> is partialState[i][0]

          for (let r = 0; r < (1 << n); r++) {
            for (let c = 0; c < (1 << n); c++) {
              // rho_rc = psi_r * conj(psi_c)
              const psi_r = partialState[r][0];
              const psi_c = partialState[c][0];
              rhoInput[r][c] = multiply(psi_r, conjugate(psi_c));
            }
          }
        } else {
          // Fallback to original binary logic if our parser failed 
          // (e.g. mixed chars or unsupported)
          if (/^[01]+$/.test(ket)) {
            const idx = parseInt(ket, 2);
            rhoInput = Array(1 << n).fill(0).map(() => Array(1 << n).fill(complex(0, 0)));
            if (rhoInput[idx]) {
              rhoInput[idx][idx] = complex(1, 0);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not parse input state for gate preview:", e);
  }

  // Apply Gate
  const rhoOutput = applyGate(rhoInput, gate, n);

  // Calculate Bloch for the FIRST qubit involved in the gate (for visualization)
  // In a multi-qubit system, this is a simplified view
  const targetQubit = gateQubits[0] || 0;
  const reduced = partialTrace(rhoOutput, targetQubit, n);
  const bloch = calculateBlochVector(reduced.matrix);

  // Identify state
  return identifyQuantumStateFromBloch(bloch, reduced.matrix);
};


const identifyQuantumStateFromBloch = (
  bloch: { x: number; y: number; z: number },
  rho: ComplexMatrix | number[][]
): string => {
  // Check Basics
  if (bloch.z > 0.9) return '|0⟩';
  if (bloch.z < -0.9) return '|1⟩';
  if (bloch.x > 0.9) return '|+⟩';
  if (bloch.x < -0.9) return '|-⟩';
  if (bloch.y > 0.9) return '|+i⟩'; // Correct Y+
  if (bloch.y < -0.9) return '|-i⟩'; // Correct Y-

  return `[${bloch.x.toFixed(2)}, ${bloch.y.toFixed(2)}, ${bloch.z.toFixed(2)}]`;
};

export const simulateCircuitWithStates = (circuit: QuantumCircuit, initialState?: any, initialKetStates?: string[]): any => {
  return simulateCircuit(circuit);
};

export { createInitialState };

// Backward compatibility exports
export const EXAMPLE_CIRCUITS: any[] = [];
export const testGateOutputs = () => { console.log("Gate testing moved to unit tests"); };

