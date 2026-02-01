import { describe, it, expect } from 'vitest';
import { KetStateParser, KetState, Complex } from '../ketState';

describe('KetStateParser', () => {
  describe('parseBraKet', () => {
    it('should parse |0⟩ correctly', () => {
      const result = KetStateParser.parseBraKet('|0⟩');
      expect(result).toEqual([
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ]);
    });

    it('should parse |1⟩ correctly', () => {
      const result = KetStateParser.parseBraKet('|1⟩');
      expect(result).toEqual([
        { re: 0, im: 0 },
        { re: 1, im: 0 }
      ]);
    });

    it('should parse |0> (without closing bracket) correctly', () => {
      const result = KetStateParser.parseBraKet('|0>');
      expect(result).toEqual([
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ]);
    });

    it('should return zero vector for unsupported bra-ket notation', () => {
      const result = KetStateParser.parseBraKet('|2⟩');
      expect(result).toEqual([
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ]);
    });

    it('should handle empty input', () => {
      const result = KetStateParser.parseBraKet('');
      expect(result).toEqual([
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ]);
    });
  });

  describe('parseVector', () => {
    it('should parse real vector [1, 0]', () => {
      const result = KetStateParser.parseVector('[1, 0]');
      expect(result).toEqual([
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ]);
    });

    it('should parse complex vector [0.707, 0.707]', () => {
      const result = KetStateParser.parseVector('[0.707, 0.707]');
      expect(result).toEqual([
        { re: 0.707, im: 0 },
        { re: 0.707, im: 0 }
      ]);
    });

    it('should parse vector with imaginary components ["0.707", "0.707i"]', () => {
      const result = KetStateParser.parseVector('["0.707", "0.707i"]');
      expect(result).toEqual([
        { re: 0.707, im: 0 },
        { re: 0, im: 0.707 }
      ]);
    });

    it('should parse complex objects [{"re": 0.707, "im": 0}, {"re": 0, "im": 0.707}]', () => {
      const result = KetStateParser.parseVector('[{"re": 0.707, "im": 0}, {"re": 0, "im": 0.707}]');
      expect(result).toEqual([
        { re: 0.707, im: 0 },
        { re: 0, im: 0.707 }
      ]);
    });

    it('should return empty array for invalid JSON', () => {
      const result = KetStateParser.parseVector('invalid json');
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      const result = KetStateParser.parseVector('"not an array"');
      expect(result).toEqual([]);
    });
  });

  describe('parsePolar', () => {
    it('should parse polar form with magnitude and phase', () => {
      const result = KetStateParser.parsePolar('[{"magnitude": 1, "phase": 0}, {"magnitude": 0, "phase": 0}]');
      expect(result.length).toBe(2);
      expect(result[0].re).toBeCloseTo(1, 5);
      expect(result[0].im).toBeCloseTo(0, 5);
      expect(result[1].re).toBeCloseTo(0, 5);
      expect(result[1].im).toBeCloseTo(0, 5);
    });

    it('should parse polar form with π/4 phase', () => {
      const result = KetStateParser.parsePolar('[{"magnitude": 0.707, "phase": 0.785}, {"magnitude": 0.707, "phase": 0}]');
      expect(result.length).toBe(2);
      expect(result[0].re).toBeCloseTo(0.5, 2);
      expect(result[0].im).toBeCloseTo(0.5, 2);
    });

    it('should return empty array for invalid JSON', () => {
      const result = KetStateParser.parsePolar('invalid json');
      expect(result).toEqual([]);
    });

    it('should handle missing magnitude or phase', () => {
      const result = KetStateParser.parsePolar('[{"magnitude": 1}, {"phase": 0}]');
      expect(result).toEqual([
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ]);
    });
  });

  describe('normalize', () => {
    it('should normalize unnormalized state', () => {
      const input: Complex[] = [
        { re: 1, im: 0 },
        { re: 1, im: 0 }
      ];
      const result = KetStateParser.normalize(input);
      const norm = Math.sqrt(result[0].re ** 2 + result[0].im ** 2 + result[1].re ** 2 + result[1].im ** 2);
      expect(norm).toBeCloseTo(1, 5);
    });

    it('should not change already normalized state', () => {
      const input: Complex[] = [
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ];
      const result = KetStateParser.normalize(input);
      expect(result).toEqual(input);
    });

    it('should handle zero vector', () => {
      const input: Complex[] = [
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ];
      const result = KetStateParser.normalize(input);
      expect(result).toEqual(input);
    });
  });

  describe('validate', () => {
    it('should validate normalized 2-level state', () => {
      const state: Complex[] = [
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ];
      expect(KetStateParser.validate(state)).toBe(true);
    });

    it('should validate normalized superposition state', () => {
      const state: Complex[] = [
        { re: 0.707, im: 0 },
        { re: 0.707, im: 0 }
      ];
      expect(KetStateParser.validate(state)).toBe(true);
    });

    it('should reject unnormalized state', () => {
      const state: Complex[] = [
        { re: 2, im: 0 },
        { re: 0, im: 0 }
      ];
      expect(KetStateParser.validate(state)).toBe(false);
    });

    it('should reject empty array', () => {
      expect(KetStateParser.validate([])).toBe(false);
    });

    it('should reject non-power-of-2 dimensions', () => {
      const state: Complex[] = [
        { re: 1, im: 0 },
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ];
      expect(KetStateParser.validate(state)).toBe(false);
    });

    it('should validate 4-level state', () => {
      const state: Complex[] = [
        { re: 1, im: 0 },
        { re: 0, im: 0 },
        { re: 0, im: 0 },
        { re: 0, im: 0 }
      ];
      expect(KetStateParser.validate(state)).toBe(true);
    });
  });
});