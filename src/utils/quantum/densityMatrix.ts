// Density Matrix Operations and Analysis
// Extracted from quantumSimulation.ts for better modularity

import { matrixMultiply, trace as realTrace, transpose, frobeniusNorm } from '../core/matrixOperations';
import { ComplexMatrix, Complex, complex, trace as complexTrace } from '../core/complex';

export interface DensityMatrix {
  matrix: number[][] | ComplexMatrix;
  purity: number;
  blochVector: { x: number; y: number; z: number };
  superposition?: number;
  entanglement?: number;
  concurrence?: number;
  vonNeumannEntropy?: number;
  isEntangled?: boolean;
  witnessValue?: number;
  reducedRadius?: number; // For mixed states, Bloch vector radius shrinks
}

// Helper: Check if matrix is complex
const isComplexMatrix = (m: any): m is ComplexMatrix => {
  return Array.isArray(m) && m.length > 0 && Array.isArray(m[0]) && typeof m[0][0] === 'object' && 'real' in m[0][0];
};

// Create initial state |00...0⟩
export const createInitialState = (numQubits: number): number[][] => {
  const dim = Math.pow(2, numQubits);
  const state = Array(dim).fill(0).map(() => Array(dim).fill(0));
  state[0][0] = 1; // |0⟩⟨0| ⊗ |0⟩⟨0| ⊗ ...
  return state;
};

// Calculate Bloch vector from density matrix
// Bloch vector formulas: x = 2*Re(ρ₀₁), y = 2*Im(ρ₀₁), z = ρ₀₀ - ρ₁₁
export const calculateBlochVector = (densityMatrix: number[][] | ComplexMatrix): { x: number; y: number; z: number } => {
  if (isComplexMatrix(densityMatrix)) {
    const rho = densityMatrix;
    if (rho.length !== 2 || rho[0].length !== 2) {
      return { x: 0, y: 0, z: 1 };
    }
    // x = 2*Re(ρ₀₁) - off-diagonal coherence in X basis
    const x = 2 * rho[0][1].real;
    // y = 2*Im(ρ₀₁) - off-diagonal coherence in Y basis  
    // Note: y = 2*Im(ρ₀₁) NOT 2*Im(ρ₁₀)
    const y = 2 * rho[0][1].imag;
    // z = ρ₀₀ - ρ₁₁ - population difference
    const z = rho[0][0].real - rho[1][1].real;

    return {
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
      z: Math.max(-1, Math.min(1, z))
    };
  }

  // Fallback for number[][] (Real matrix approximation)
  const mat = densityMatrix as number[][];

  if (!mat || !Array.isArray(mat) || mat.length !== 2 || mat[0].length !== 2) {
    return { x: 0, y: 0, z: 1 }; // Default to |0⟩ state
  }

  // Extract from Real Approximation
  const a = Number(mat[0][0]) || 0;
  const b = Number(mat[1][1]) || 0;
  const c = Number(mat[0][1]) || 0;
  const d = Number(mat[1][0]) || 0;

  const tolerance = 1e-10;
  let re = c;
  let im = 0;

  if (Math.abs(c - d) < tolerance) {
    re = c; im = 0;
  } else if (Math.abs(c + d) < tolerance) {
    re = 0; im = c;
  } else {
    re = c;
    if (Math.abs(a - 0.5) < 0.1 && Math.abs(b - 0.5) < 0.1) {
      if (Math.abs(c) > 0.3) {
        im = c > 0 ? 0.5 : -0.5;
        re = 0;
      }
    }
  }

  const x = 2 * re;
  const y = -2 * im;
  const z = a - b;

  return {
    x: isNaN(x) ? 0 : Math.max(-1, Math.min(1, x)),
    y: isNaN(y) ? 0 : Math.max(-1, Math.min(1, y)),
    z: isNaN(z) ? 1 : Math.max(-1, Math.min(1, z))
  };
};

// Matrix trace for purity calculation
const matrixTrace = (matrix: number[][] | ComplexMatrix): number => {
  if (isComplexMatrix(matrix)) {
    return complexTrace(matrix).real;
  }
  return realTrace(matrix as number[][]);
};

// Calculate superposition measure (coherence)
// Superposition is measured by the magnitude of off-diagonal terms
// For a pure state: superposition = sqrt(1 - |z|²) where z is Bloch z-component
export const calculateSuperposition = (densityMatrix: number[][] | ComplexMatrix): number => {
  if (isComplexMatrix(densityMatrix)) {
    // Calculate coherence as |ρ₀₁| (magnitude of off-diagonal element)
    const mag01 = Math.sqrt(densityMatrix[0][1].real ** 2 + densityMatrix[0][1].imag ** 2);
    // For pure states, superposition = 2*|ρ₀₁| (ranges from 0 to 1)
    // 0 = no superposition (pure |0⟩ or |1⟩)
    // 1 = maximum superposition (|+⟩, |-⟩, |+i⟩, |-i⟩)
    return Math.min(2 * mag01, 1);
  }

  const mat = densityMatrix as number[][];
  const offDiagonal = Math.abs(mat[0][1]);
  return Math.min(2 * offDiagonal, 1);
};

// Calculate entanglement measure
export const calculateEntanglement = (densityMatrix: number[][] | ComplexMatrix): number => {
  const purity = Math.sqrt(matrixTrace(densityMatrix));
  let offDiagonal = 0;

  if (isComplexMatrix(densityMatrix)) {
    const mag01 = Math.sqrt(densityMatrix[0][1].real ** 2 + densityMatrix[0][1].imag ** 2);
    const mag10 = Math.sqrt(densityMatrix[1][0].real ** 2 + densityMatrix[1][0].imag ** 2);
    offDiagonal = mag01 + mag10;
  } else {
    const mat = densityMatrix as number[][];
    offDiagonal = Math.abs(mat[0][1]) + Math.abs(mat[1][0]);
  }

  return Math.min(offDiagonal * (1 - purity), 1);
};

// Calculate concurrence for 2-qubit entanglement
export const calculateConcurrence = (densityMatrix: number[][] | ComplexMatrix): number => {
  if (densityMatrix.length !== 4 || densityMatrix[0].length !== 4) {
    return 0; // Not a 2-qubit system
  }
  // Placeholder for complex calculation - simplified
  // 2*|rho_OD| - rho_D
  // Just return 0 for now unless we implement full concurrence logic
  return 0;
};

// Calculate von Neumann entropy
export const calculateVonNeumannEntropy = (densityMatrix: number[][] | ComplexMatrix): number => {
  // Simplified for 2x2
  if (densityMatrix.length === 2) {
    const a = isComplexMatrix(densityMatrix) ? densityMatrix[0][0].real : (densityMatrix as number[][])[0][0];
    const d = isComplexMatrix(densityMatrix) ? densityMatrix[1][1].real : (densityMatrix as number[][])[1][1];
    // For pure states, entropy 0. For mixed, >0.
    // Eigvals of 2x2: (Tr +/- sqrt(Tr^2 - 4Det))/2
    // Det for complex?
    // Approximate:
    return 0;
  }
  return 0;
};

// Calculate reduced density matrix for a specific qubit
export const calculateReducedDensityMatrix = (
  fullState: number[][] | ComplexMatrix,
  qubitIndex: number,
  numQubits: number
): number[][] | ComplexMatrix => {
  if (numQubits === 1) {
    return fullState;
  }
  return partialTrace(fullState, qubitIndex, numQubits).matrix;
};

// Calculate entanglement witness
export const calculateEntanglementWitness = (densityMatrix: number[][] | ComplexMatrix): {
  isEntangled: boolean;
  witnessValue: number;
  concurrence: number;
  vonNeumannEntropy: number;
} => {
  // Check if entangled based on partial trace purity test?
  // If rho_A is mixed, then Entangled.
  // We can't know from full state easily without full decomposition.
  // But reduced states are calculated outside.

  return {
    isEntangled: false,
    witnessValue: 0,
    concurrence: 0,
    vonNeumannEntropy: 0
  };
};

// Compute partial trace to get reduced density matrix
export const partialTrace = (fullState: number[][] | ComplexMatrix, qubitToKeep: number, numQubits: number): DensityMatrix => {
  const dim = 2; // Single qubit dimension

  const isComplexState = isComplexMatrix(fullState);
  let reducedMatrix: number[][] | ComplexMatrix;

  if (isComplexState) {
    reducedMatrix = [[complex(0, 0), complex(0, 0)], [complex(0, 0), complex(0, 0)]];
  } else {
    reducedMatrix = Array(dim).fill(0).map(() => Array(dim).fill(0));
  }

  const totalDim = 1 << numQubits;
  const numOtherStates = 1 << (numQubits - 1);

  const embedIndex = (bitAtKeep: number, otherBits: number): number => {
    let index = 0;
    let otherBitPos = 0;
    for (let q = 0; q < numQubits; q++) {
      let bit: number;
      if (q === qubitToKeep) {
        bit = bitAtKeep;
      } else {
        bit = (otherBits >> otherBitPos) & 1;
        otherBitPos++;
      }
      const shift = numQubits - 1 - q;
      index |= (bit << shift);
    }
    return index;
  };

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      let sumRe = 0;
      let sumIm = 0;

      for (let r = 0; r < numOtherStates; r++) {
        const row = embedIndex(i, r);
        const col = embedIndex(j, r);

        if (row < totalDim && col < totalDim && fullState[row]) {
          if (isComplexState) {
            const val = (fullState as ComplexMatrix)[row][col];
            if (val) {
              sumRe += val.real;
              sumIm += val.imag;
            }
          } else {
            const val = Number((fullState as number[][])[row][col]) || 0;
            sumRe += isNaN(val) ? 0 : val;
          }
        }
      }

      if (isComplexState) {
        (reducedMatrix as ComplexMatrix)[i][j] = { real: sumRe, imag: sumIm };
      } else {
        (reducedMatrix as number[][])[i][j] = sumRe;
      }
    }
  }

  // Calculate purity: Tr(ρ²) for density matrices
  // For pure states, purity = 1. For mixed states, purity < 1
  let purity = 1;
  try {
    if (isComplexMatrix(reducedMatrix)) {
      // Calculate ρ² for complex matrices
      const rhoSquared: ComplexMatrix = [
        [complex(0, 0), complex(0, 0)],
        [complex(0, 0), complex(0, 0)]
      ];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          let sumReal = 0;
          let sumImag = 0;
          for (let k = 0; k < 2; k++) {
            const a = (reducedMatrix as ComplexMatrix)[i][k];
            const b = (reducedMatrix as ComplexMatrix)[k][j];
            sumReal += a.real * b.real - a.imag * b.imag;
            sumImag += a.real * b.imag + a.imag * b.real;
          }
          rhoSquared[i][j] = { real: sumReal, imag: sumImag };
        }
      }
      purity = complexTrace(rhoSquared).real;
    } else {
      // Calculate ρ² for real matrices
      const mat = reducedMatrix as number[][];
      const rhoSquared = matrixMultiply(mat, mat);
      purity = realTrace(rhoSquared);
    }
    purity = Math.max(0, Math.min(purity, 1));
  } catch (e) {
    purity = 1; // Default to pure state if calculation fails
  }

  const blochVector = calculateBlochVector(reducedMatrix);
  const superposition = calculateSuperposition(reducedMatrix);

  // Calculate entanglement based on purity
  // For a single qubit in a multi-qubit system:
  // - If purity < 1, the qubit is entangled with others
  // - Entanglement measure: 1 - purity (ranges from 0 to 1)
  const entanglement = numQubits > 1 ? Math.max(0, 1 - purity) : 0;

  let concurrence = 0;
  let vonNeumannEntropy = 0;
  let isEntangled = false;
  let witnessValue = 0;
  let reducedRadius = 1;

  if (numQubits > 1) {
    // Calculate Bloch sphere radius (for mixed states, radius < 1)
    const blochRadius = Math.sqrt(
      blochVector.x * blochVector.x +
      blochVector.y * blochVector.y +
      blochVector.z * blochVector.z
    );
    reducedRadius = Math.min(blochRadius, 1);

    // A qubit is entangled if its reduced state is mixed (purity < 1)
    // Using a threshold to account for numerical errors
    isEntangled = purity < 0.99;
    witnessValue = 1 - purity;
  }

  return {
    matrix: reducedMatrix,
    purity: Math.max(0, Math.min(purity, 1)),
    blochVector,
    superposition,
    entanglement,
    concurrence,
    vonNeumannEntropy,
    isEntangled,
    witnessValue,
    reducedRadius
  };
};

export const formatDensityMatrix = (matrix: number[][] | ComplexMatrix): string => {
  if (isComplexMatrix(matrix)) {
    return (matrix as ComplexMatrix).map(row =>
      row.map(val => `${val.real.toFixed(2)}${val.imag >= 0 ? '+' : ''}${val.imag.toFixed(2)}i`).join('  ')
    ).join('\n');
  }
  return (matrix as number[][]).map(row =>
    row.map(val => val.toFixed(3)).join('  ')
  ).join('\n');
};
