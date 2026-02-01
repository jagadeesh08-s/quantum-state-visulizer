export interface KetState {
  notation: 'bra-ket' | 'vector' | 'polar';
  value: string | number[] | { magnitude: number; phase: number }[];
}

export interface Complex {
  re: number;
  im: number;
}

export class KetStateParser {
  // Parse bra-ket notation like "α|0⟩ + β|1⟩"
  static parseBraKet(input: string): Complex[] {
    // TODO: Implement full parser with support for coefficients, i, sqrt, pi, etc.
    // For now, support simple |0⟩ and |1⟩ states
    input = input.trim();
    if (input === '|0⟩' || input === '|0>') {
      return [{ re: 1, im: 0 }, { re: 0, im: 0 }];
    } else if (input === '|1⟩' || input === '|1>') {
      return [{ re: 0, im: 0 }, { re: 1, im: 0 }];
    }
    // Fallback: return zero vector
    return [{ re: 0, im: 0 }, { re: 0, im: 0 }];
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
