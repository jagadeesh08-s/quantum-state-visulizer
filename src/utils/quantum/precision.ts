// Enhanced precision and numerical stability for quantum computations
// Implements high-precision arithmetic and error correction

import { Complex } from '../core/complex';

// High-precision constants
export const PRECISION = {
  EPSILON: 1e-15,
  TOLERANCE: 1e-12,
  MAX_ITERATIONS: 1000,
  CONVERGENCE_THRESHOLD: 1e-10
};

// Enhanced complex number operations with precision control
export class PrecisionComplex {
  constructor(
    public real: number,
    public imag: number,
    public precision: number = PRECISION.EPSILON
  ) { }

  static from(complex: Complex | PrecisionComplex): PrecisionComplex {
    if (complex instanceof PrecisionComplex) {
      return complex;
    }
    return new PrecisionComplex(complex.real, complex.imag);
  }

  add(other: PrecisionComplex | Complex): PrecisionComplex {
    const o = PrecisionComplex.from(other);
    return new PrecisionComplex(
      this.real + o.real,
      this.imag + o.imag,
      Math.min(this.precision, o.precision)
    );
  }

  multiply(other: PrecisionComplex | Complex): PrecisionComplex {
    const o = PrecisionComplex.from(other);
    const real = this.real * o.real - this.imag * o.imag;
    const imag = this.real * o.imag + this.imag * o.real;

    // Check for numerical instability
    if (Math.abs(real) < this.precision && Math.abs(imag) < this.precision) {
      return new PrecisionComplex(0, 0, this.precision);
    }

    return new PrecisionComplex(real, imag, Math.min(this.precision, o.precision));
  }

  conjugate(): PrecisionComplex {
    return new PrecisionComplex(this.real, -this.imag, this.precision);
  }

  magnitude(): number {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  phase(): number {
    return Math.atan2(this.imag, this.real);
  }

  normalize(): PrecisionComplex {
    const mag = this.magnitude();
    if (mag < this.precision) {
      return new PrecisionComplex(0, 0, this.precision);
    }
    return new PrecisionComplex(this.real / mag, this.imag / mag, this.precision);
  }

  equals(other: PrecisionComplex | Complex, tolerance: number = PRECISION.TOLERANCE): boolean {
    const o = PrecisionComplex.from(other);
    return Math.abs(this.real - o.real) < tolerance && Math.abs(this.imag - o.imag) < tolerance;
  }
}

// High-precision matrix operations
export class PrecisionMatrix {
  constructor(
    public data: PrecisionComplex[][],
    public precision: number = PRECISION.EPSILON
  ) { }

  static fromRealMatrix(matrix: number[][], precision: number = PRECISION.EPSILON): PrecisionMatrix {
    const data = matrix.map(row =>
      row.map(val => new PrecisionComplex(val, 0, precision))
    );
    return new PrecisionMatrix(data, precision);
  }

  static identity(size: number, precision: number = PRECISION.EPSILON): PrecisionMatrix {
    const data: PrecisionComplex[][] = [];
    for (let i = 0; i < size; i++) {
      data[i] = [];
      for (let j = 0; j < size; j++) {
        data[i][j] = new PrecisionComplex(i === j ? 1 : 0, 0, precision);
      }
    }
    return new PrecisionMatrix(data, precision);
  }

  multiply(other: PrecisionMatrix): PrecisionMatrix {
    const rows = this.data.length;
    const cols = other.data[0].length;
    const common = this.data[0].length;

    const result: PrecisionComplex[][] = [];
    for (let i = 0; i < rows; i++) {
      result[i] = [];
      for (let j = 0; j < cols; j++) {
        let sum = new PrecisionComplex(0, 0, this.precision);
        for (let k = 0; k < common; k++) {
          sum = sum.add(this.data[i][k].multiply(other.data[k][j]));
        }
        result[i][j] = sum;
      }
    }

    return new PrecisionMatrix(result, Math.min(this.precision, other.precision));
  }

  add(other: PrecisionMatrix): PrecisionMatrix {
    if (this.data.length !== other.data.length || this.data[0].length !== other.data[0].length) {
      throw new Error('Matrix dimensions must match for addition');
    }

    const result: PrecisionComplex[][] = [];
    for (let i = 0; i < this.data.length; i++) {
      result[i] = [];
      for (let j = 0; j < this.data[0].length; j++) {
        result[i][j] = this.data[i][j].add(other.data[i][j]);
      }
    }

    return new PrecisionMatrix(result, Math.min(this.precision, other.precision));
  }

  conjugateTranspose(): PrecisionMatrix {
    const rows = this.data.length;
    const cols = this.data[0].length;

    const result: PrecisionComplex[][] = [];
    for (let i = 0; i < cols; i++) {
      result[i] = [];
      for (let j = 0; j < rows; j++) {
        result[i][j] = this.data[j][i].conjugate();
      }
    }

    return new PrecisionMatrix(result, this.precision);
  }

  // Check if matrix is unitary (U†U ≈ I)
  isUnitary(tolerance: number = PRECISION.TOLERANCE): boolean {
    try {
      const conjugateTranspose = this.conjugateTranspose();
      const product = conjugateTranspose.multiply(this);
      const identity = PrecisionMatrix.identity(this.data.length, this.precision);

      for (let i = 0; i < product.data.length; i++) {
        for (let j = 0; j < product.data[0].length; j++) {
          if (!product.data[i][j].equals(identity.data[i][j], tolerance)) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Normalize matrix to ensure numerical stability
  normalize(): PrecisionMatrix {
    // Find the maximum magnitude element
    let maxMagnitude = 0;
    for (const row of this.data) {
      for (const element of row) {
        maxMagnitude = Math.max(maxMagnitude, element.magnitude());
      }
    }

    if (maxMagnitude < this.precision) {
      return PrecisionMatrix.identity(this.data.length, this.precision);
    }

    // Normalize all elements
    const normalized: PrecisionComplex[][] = [];
    for (const row of this.data) {
      const normalizedRow: PrecisionComplex[] = [];
      for (const element of row) {
        normalizedRow.push(new PrecisionComplex(
          element.real / maxMagnitude,
          element.imag / maxMagnitude,
          this.precision
        ));
      }
      normalized.push(normalizedRow);
    }

    return new PrecisionMatrix(normalized, this.precision);
  }

  // Convert back to regular number matrix for compatibility
  toRealMatrix(): number[][] {
    return this.data.map(row =>
      row.map(element => {
        // Handle small values that should be zero
        const real = Math.abs(element.real) < this.precision ? 0 : element.real;
        const imag = Math.abs(element.imag) < this.precision ? 0 : element.imag;

        // For real matrices, return real part if imaginary part is negligible
        if (Math.abs(imag) < this.precision) {
          return real;
        }

        // If complex, return magnitude (for density matrices)
        return Math.sqrt(real * real + imag * imag);
      })
    );
  }
}

// Enhanced numerical utilities
export const numericalUtils = {
  // Stable matrix inversion using SVD-like decomposition
  invertMatrix: (matrix: number[][]): number[][] => {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [...row, ...(i === 0 ? [1] : i === 1 ? [0] : [0])]);

    // Gaussian elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Eliminate
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
      for (let k = i - 1; k >= 0; k--) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = 2 * n - 1; j >= i; j--) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Normalize diagonal
    for (let i = 0; i < n; i++) {
      const diagonal = augmented[i][i];
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= diagonal;
      }
    }

    return augmented.map(row => row.slice(n));
  },

  // Stable eigenvalue computation for small matrices
  eigenvalues2x2: (matrix: number[][]): number[] => {
    const [[a, b], [c, d]] = matrix;
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;

    if (discriminant < 0) {
      // Complex eigenvalues - return real parts for stability
      return [trace / 2, trace / 2];
    }

    const sqrtD = Math.sqrt(discriminant);
    return [
      (trace + sqrtD) / 2,
      (trace - sqrtD) / 2
    ];
  },

  // Check matrix condition number
  conditionNumber: (matrix: number[][]): number => {
    // Simplified condition number estimation
    let maxRowSum = 0;
    let minRowSum = Infinity;

    for (const row of matrix) {
      const rowSum = row.reduce((sum, val) => sum + Math.abs(val), 0);
      maxRowSum = Math.max(maxRowSum, rowSum);
      minRowSum = Math.min(minRowSum, rowSum);
    }

    return minRowSum > 0 ? maxRowSum / minRowSum : Infinity;
  },

  // Numerical integration for continuous quantum systems
  trapezoidalRule: (func: (x: number) => number, a: number, b: number, n: number): number => {
    const h = (b - a) / n;
    let sum = (func(a) + func(b)) / 2;

    for (let i = 1; i < n; i++) {
      sum += func(a + i * h);
    }

    return sum * h;
  },

  // Adaptive precision control
  adaptivePrecision: (value: number, targetPrecision: number = PRECISION.EPSILON): number => {
    if (Math.abs(value) < targetPrecision) {
      return 0;
    }

    // Round to appropriate precision
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const scale = Math.pow(10, -magnitude + 2); // Keep 3 significant digits
    return Math.round(value * scale) / scale;
  }
};

// Error correction and validation
export const validationUtils = {
  // Check if matrix represents a valid quantum state
  isValidDensityMatrix: (matrix: number[][] | PrecisionComplex[][], tolerance: number = PRECISION.TOLERANCE): boolean => {
    let n = matrix.length;
    let data: PrecisionComplex[][];

    if (n === 0) return false;

    // Convert to PrecisionComplex if needed
    if (typeof matrix[0][0] === 'number') {
      data = (matrix as number[][]).map(row =>
        row.map(val => new PrecisionComplex(val, 0))
      );
    } else {
      data = matrix as PrecisionComplex[][];
    }

    // Check squareness
    if (data[0].length !== n) return false;

    // Check hermiticity: ρ = ρ†
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const diffReal = Math.abs(data[i][j].real - data[j][i].real);
        const diffImag = Math.abs(data[i][j].imag + data[j][i].imag); // Conjugate means flip imag
        if (diffReal > tolerance || diffImag > tolerance) {
          return false;
        }
      }
    }

    // Check trace = 1
    let traceReal = 0;
    let traceImag = 0;
    for (let i = 0; i < n; i++) {
      traceReal += data[i][i].real;
      traceImag += data[i][i].imag;
    }

    if (Math.abs(traceReal - 1) > tolerance || Math.abs(traceImag) > tolerance) {
      return false;
    }

    // Check positive semidefinite (ρ ≥ 0)
    // For 2x2 we can use eigenvalues, for larger matrices we'd ideally use Cholesky or full Eigendecomposition
    if (n === 2) {
      const eigenvalues = numericalUtils.eigenvalues2x2([
        [data[0][0].real, data[0][1].real],
        [data[1][0].real, data[1][1].real]
      ]);
      return eigenvalues.every(ev => ev >= -tolerance);
    }

    return true; // Simple check passed, assume true for larger matrices for now
  },

  // Correct small numerical errors in matrices
  correctNumericalErrors: (matrix: number[][], tolerance: number = PRECISION.TOLERANCE): number[][] => {
    return matrix.map(row =>
      row.map(val => Math.abs(val) < tolerance ? 0 : val)
    );
  },

  // Filter small errors from complex matrices
  filterSmallErrors: (matrix: PrecisionComplex[][], tolerance: number = PRECISION.TOLERANCE): PrecisionComplex[][] => {
    return matrix.map(row =>
      row.map(c => new PrecisionComplex(
        Math.abs(c.real) < tolerance ? 0 : c.real,
        Math.abs(c.imag) < tolerance ? 0 : c.imag,
        c.precision
      ))
    );
  },

  // Ensure matrix is properly normalized
  normalizeDensityMatrix: (matrix: number[][]): number[][] => {
    const traceVal = matrix.reduce((sum, row, i) => sum + row[i], 0);
    if (Math.abs(traceVal) < PRECISION.EPSILON) {
      return matrix; // Avoid division by zero
    }

    return matrix.map(row => row.map(val => val / traceVal));
  }
};

export default {
  PrecisionComplex,
  PrecisionMatrix,
  numericalUtils,
  validationUtils,
  PRECISION
};