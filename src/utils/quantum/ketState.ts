export interface KetState {
  notation: 'bra-ket' | 'vector' | 'polar';
  value: string | number[] | { magnitude: number; phase: number }[];
}

export interface Complex {
  re: number;
  im: number;
}

export class KetStateParser {
  // Parse bra-ket notation like "α|0⟩ + β|1⟩" with full support for complex coefficients
  static parseBraKet(input: string): Complex[] {
    input = input.trim().replace(/\s+/g, '');

    // Handle common named states
    const namedStates: { [key: string]: Complex[] } = {
      '|0⟩': [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      '|0>': [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      '|1⟩': [{ re: 0, im: 0 }, { re: 1, im: 0 }],
      '|1>': [{ re: 0, im: 0 }, { re: 1, im: 0 }],
      '|+⟩': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }],
      '|+>': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }],
      '|-⟩': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }],
      '|->': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }],
      '|i⟩': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: 1 / Math.sqrt(2) }],
      '|i>': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: 1 / Math.sqrt(2) }],
      '|-i⟩': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: -1 / Math.sqrt(2) }],
      '|-i>': [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: -1 / Math.sqrt(2) }],
    };

    if (namedStates[input]) {
      return namedStates[input];
    }

    // Parse general form: coefficient|basis⟩ + coefficient|basis⟩
    // Split by + or - (keeping the sign)
    const terms = input.split(/(?=[+-])/).filter(t => t.length > 0);

    // Initialize result array (assume 2D for single qubit, expand if needed)
    const maxBasis = this.detectMaxBasis(input);
    const dim = Math.pow(2, maxBasis);
    const result: Complex[] = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }));

    for (const term of terms) {
      const { coefficient, basisIndex } = this.parseTerm(term);
      if (basisIndex < dim) {
        result[basisIndex] = this.addComplex(result[basisIndex], coefficient);
      }
    }

    return this.normalize(result);
  }

  // Helper: Parse a single term like "0.5|0⟩" or "sqrt(2)/2*i|1⟩"
  private static parseTerm(term: string): { coefficient: Complex; basisIndex: number } {
    // Extract basis state (|0⟩, |1⟩, etc.)
    const basisMatch = term.match(/\|(\d+)[⟩>]/);
    if (!basisMatch) {
      return { coefficient: { re: 0, im: 0 }, basisIndex: 0 };
    }

    const basisIndex = parseInt(basisMatch[1]);
    const coeffStr = term.substring(0, term.indexOf('|')).trim();

    const coefficient = this.parseCoefficient(coeffStr || '1');
    return { coefficient, basisIndex };
  }

  // Helper: Parse coefficient with support for sqrt, pi, fractions, i
  private static parseCoefficient(str: string): Complex {
    str = str.trim();
    if (!str || str === '+') return { re: 1, im: 0 };
    if (str === '-') return { re: -1, im: 0 };

    let re = 0, im = 0;
    let sign = 1;

    // Handle leading sign
    if (str.startsWith('-')) {
      sign = -1;
      str = str.substring(1);
    } else if (str.startsWith('+')) {
      str = str.substring(1);
    }

    // Check if it contains 'i'
    const hasI = str.includes('i');

    // Remove 'i' for parsing, we'll apply it later
    const numStr = str.replace(/i/g, '').replace(/\*/g, '');

    // Evaluate mathematical expression
    let value = this.evaluateMathExpression(numStr);

    if (hasI) {
      im = sign * value;
    } else {
      re = sign * value;
    }

    return { re, im };
  }

  // Helper: Evaluate mathematical expressions with sqrt, pi, fractions
  private static evaluateMathExpression(expr: string): number {
    expr = expr.trim();
    if (!expr) return 1;

    // Replace mathematical constants
    expr = expr.replace(/pi|π/gi, String(Math.PI));
    expr = expr.replace(/e(?![0-9])/gi, String(Math.E));

    // Handle sqrt
    expr = expr.replace(/sqrt\(([^)]+)\)/gi, (_, inner) => {
      return String(Math.sqrt(this.evaluateMathExpression(inner)));
    });

    // Handle fractions (e.g., "1/2")
    if (expr.includes('/')) {
      const parts = expr.split('/');
      if (parts.length === 2) {
        const numerator = this.evaluateMathExpression(parts[0]);
        const denominator = this.evaluateMathExpression(parts[1]);
        return numerator / denominator;
      }
    }

    // Try to evaluate as number
    try {
      // Use Function constructor for safe evaluation (limited scope)
      return new Function(`return ${expr}`)();
    } catch {
      return parseFloat(expr) || 1;
    }
  }

  // Helper: Detect maximum basis index to determine dimension
  private static detectMaxBasis(input: string): number {
    const matches = input.match(/\|(\d+)[⟩>]/g);
    if (!matches) return 1;

    const indices = matches.map(m => parseInt(m.match(/\d+/)![0]));
    const maxIndex = Math.max(...indices);

    // Return number of qubits needed
    return Math.ceil(Math.log2(maxIndex + 1)) || 1;
  }

  // Helper: Add two complex numbers
  private static addComplex(a: Complex, b: Complex): Complex {
    return { re: a.re + b.re, im: a.im + b.im };
  }

  // Parse vector form like "[1, 0]" or "[0.707, 0.707]"
  static parseVector(input: string): Complex[] {
    try {
      const arr = JSON.parse(input);
      if (Array.isArray(arr)) {
        return arr.map((v: any) => {
          if (typeof v === 'number') {
            return { re: v, im: 0 };
          } else if (typeof v === 'string') {
            if (v.endsWith('i')) {
              const re = 0;
              const im = parseFloat(v.slice(0, -1));
              return { re, im };
            } else {
              // Try to parse as regular number
              const num = parseFloat(v);
              if (!isNaN(num)) {
                return { re: num, im: 0 };
              }
            }
          } else if (typeof v === 'object' && 're' in v && 'im' in v) {
            return { re: v.re, im: v.im };
          }
          return { re: 0, im: 0 };
        });
      }
    } catch {
      // Invalid JSON
    }
    return [];
  }

  // Parse polar form like "[{ magnitude: 1, phase: 0 }, { magnitude: 0, phase: 0 }]"
  static parsePolar(input: string): Complex[] {
    try {
      const arr = JSON.parse(input);
      if (Array.isArray(arr)) {
        return arr.map((v: any) => {
          if (typeof v === 'object' && 'magnitude' in v && 'phase' in v) {
            const re = v.magnitude * Math.cos(v.phase);
            const im = v.magnitude * Math.sin(v.phase);
            return { re, im };
          }
          return { re: 0, im: 0 };
        });
      }
    } catch {
      // Invalid JSON
    }
    return [];
  }

  // Normalize state vector
  static normalize(state: Complex[]): Complex[] {
    const norm = Math.sqrt(state.reduce((acc, c) => acc + c.re * c.re + c.im * c.im, 0));
    if (norm === 0) return state;
    return state.map(c => ({ re: c.re / norm, im: c.im / norm }));
  }

  // Validate state vector (check normalization and dimension)
  static validate(state: Complex[]): boolean {
    if (!Array.isArray(state) || state.length === 0) return false;
    const norm = Math.sqrt(state.reduce((acc, c) => acc + c.re * c.re + c.im * c.im, 0));
    if (Math.abs(norm - 1) > 1e-3) return false; // More lenient tolerance for floating point
    // Check dimension is power of 2
    return (Math.log2(state.length) % 1) === 0;
  }
}
