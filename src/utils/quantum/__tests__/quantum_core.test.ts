import { describe, it, expect } from 'vitest';
import { PrecisionComplex, PrecisionMatrix, validationUtils } from '../precision';
import { GATES } from '../gates';
import { complex, ComplexMatrix } from '../../core/complex';

describe('Quantum Core Precision', () => {
    it('should handle complex arithmetic with high precision', () => {
        const c1 = new PrecisionComplex(1, 1);
        const c2 = new PrecisionComplex(0, 1);
        const result = c1.multiply(c2);
        expect(result.real).toBeCloseTo(-1);
        expect(result.imag).toBeCloseTo(1);
    });

    it('should validate 2x2 density matrices correctly', () => {
        const validRho = [
            [1, 0],
            [0, 0]
        ];
        expect(validationUtils.isValidDensityMatrix(validRho)).toBe(true);

        const invalidRho = [
            [1, 1],
            [1, 0]
        ];
        expect(validationUtils.isValidDensityMatrix(invalidRho)).toBe(false);
    });
});

describe('Quantum Gates', () => {
    it('should have unitary complex matrices for all gates', () => {
        const testGates = ['H', 'X', 'Y', 'Z', 'S', 'T', 'CNOT', 'CZ', 'SWAP', 'CY', 'CH', 'SQRTX', 'SQRTY', 'SQRTZ'];

        for (const gateName of testGates) {
            const gate = GATES[gateName as keyof typeof GATES] as ComplexMatrix;
            const precisionGate = new PrecisionMatrix(
                gate.map(row => row.map(c => new PrecisionComplex(c.real, c.imag)))
            );
            expect(precisionGate.isUnitary()).toBe(true);
        }
    });

    it('should have unitary rotation gates', () => {
        const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI];
        const rotGates = ['RX', 'RY', 'RZ', 'P'];

        for (const gateName of rotGates) {
            for (const angle of angles) {
                const gateFn = GATES[gateName as keyof typeof GATES] as (a: number) => ComplexMatrix;
                const gate = gateFn(angle);
                const precisionGate = new PrecisionMatrix(
                    gate.map(row => row.map(c => new PrecisionComplex(c.real, c.imag)))
                );
                expect(precisionGate.isUnitary()).toBe(true);
            }
        }
    });

    it('should have unitary two-qubit rotation gates', () => {
        const rGates = ['RXX', 'RYY', 'RZZ'];
        const angle = Math.PI / 3;

        for (const gateName of rGates) {
            const gateFn = GATES[gateName as keyof typeof GATES] as (a: number) => ComplexMatrix;
            const gate = gateFn(angle);
            const precisionGate = new PrecisionMatrix(
                gate.map(row => row.map(c => new PrecisionComplex(c.real, c.imag)))
            );
            expect(precisionGate.isUnitary()).toBe(true);
        }
    });
});
