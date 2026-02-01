import { describe, it, expect } from 'vitest';
import { simulateCircuit, QuantumCircuit } from '../circuitOperations';

// Test circuits that should work with the current implementation
const BASIC_EXAMPLE_CIRCUITS: QuantumCircuit[] = [
  {
    numQubits: 1,
    gates: []
  },
  {
    numQubits: 1,
    gates: [{ name: 'X', qubits: [0] }]
  },
  {
    numQubits: 1,
    gates: [{ name: 'H', qubits: [0] }]
  },
  {
    numQubits: 2,
    gates: [{ name: 'CNOT', qubits: [0, 1] }]
  },
  {
    numQubits: 2,
    gates: [
      { name: 'H', qubits: [0] },
      { name: 'CNOT', qubits: [0, 1] }
    ]
  }
];

describe('Backward Compatibility', () => {
  describe('Basic Circuit Structures', () => {
    it('should handle empty circuit', () => {
      const circuit = BASIC_EXAMPLE_CIRCUITS[0];
      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities.length).toBe(2); // 2^1 = 2 states
      expect(result.probabilities[0]).toBeCloseTo(1, 5); // |0⟩
      expect(result.probabilities[1]).toBeCloseTo(0, 5); // |1⟩
    });

    it('should handle single X gate', () => {
      const circuit = BASIC_EXAMPLE_CIRCUITS[1];
      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities[0]).toBeCloseTo(0, 5); // |0⟩
      expect(result.probabilities[1]).toBeCloseTo(1, 5); // |1⟩
    });

    it('should handle single H gate', () => {
      const circuit = BASIC_EXAMPLE_CIRCUITS[2];
      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities[0]).toBeCloseTo(0.5, 2); // |0⟩
      expect(result.probabilities[1]).toBeCloseTo(0.5, 2); // |1⟩
    });

    it('should handle two-qubit CNOT gate', () => {
      const circuit = BASIC_EXAMPLE_CIRCUITS[3];
      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities.length).toBe(4); // 2^2 = 4 states
      expect(result.probabilities[0]).toBeCloseTo(1, 5); // |00⟩
      expect(result.probabilities[3]).toBeCloseTo(0, 5); // |11⟩
    });

    it('should handle Bell state circuit', () => {
      const circuit = BASIC_EXAMPLE_CIRCUITS[4];
      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities.length).toBe(4);
      expect(result.probabilities[0]).toBeCloseTo(0.5, 2); // |00⟩
      expect(result.probabilities[3]).toBeCloseTo(0.5, 2); // |11⟩
    });
  });

  describe('Circuit Builder Compatibility', () => {
    it('should handle circuits created from visual builder format', () => {
      // Simulate circuit created by CircuitBuilder component
      const visualCircuit: QuantumCircuit = {
        numQubits: 2,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'CNOT', qubits: [0, 1] }
        ]
      };

      const result = simulateCircuit(visualCircuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities.length).toBe(4);

      // H on qubit 0, then CNOT should create Bell state |00⟩ + |11⟩
      expect(result.probabilities[0]).toBeCloseTo(0.5, 2); // |00⟩
      expect(result.probabilities[3]).toBeCloseTo(0.5, 2); // |11⟩
    });

    it('should handle parameterized gates from visual builder', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: [
          {
            name: 'RX',
            qubits: [0],
            parameters: { angle: Math.PI }
          }
        ]
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities[0]).toBeCloseTo(0, 2); // Should flip like X gate
      expect(result.probabilities[1]).toBeCloseTo(1, 2);
    });
  });

  describe('State Initialization', () => {
    it('should work with default initial state', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: []
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      // Should start in |0⟩ state
      expect(result.probabilities[0]).toBeCloseTo(1, 5);
    });

    it('should handle different qubit counts', () => {
      const testCases = [1, 2, 3, 4];

      testCases.forEach(numQubits => {
        const circuit: QuantumCircuit = {
          numQubits,
          gates: []
        };

        const result = simulateCircuit(circuit);

        expect(result.error).toBeUndefined();
        expect(result.probabilities.length).toBe(Math.pow(2, numQubits));
        // Should start with all probability on |00...0⟩ state
        expect(result.probabilities[0]).toBeCloseTo(1, 5);
      });
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should not crash on invalid gate names', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: [{ name: 'NONEXISTENT_GATE', qubits: [0] }]
      };

      const result = simulateCircuit(circuit);

      // Should not crash, should return initial state
      expect(result.probabilities[0]).toBeCloseTo(1, 5);
    });

    it('should handle out-of-bounds qubit indices gracefully', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: [{ name: 'X', qubits: [10] }] // Way out of bounds
      };

      const result = simulateCircuit(circuit);

      // Should not crash, should return initial state
      expect(result.probabilities[0]).toBeCloseTo(1, 5);
    });

    it('should handle negative qubit indices', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: [{ name: 'X', qubits: [-1] }]
      };

      const result = simulateCircuit(circuit);

      // Should not crash, should return initial state
      expect(result.probabilities[0]).toBeCloseTo(1, 5);
    });
  });

  describe('Density Matrix and Reduced States', () => {
    it('should provide valid density matrices', () => {
      const circuit: QuantumCircuit = {
        numQubits: 2,
        gates: [{ name: 'H', qubits: [0] }]
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.densityMatrix).toBeDefined();
      expect(Array.isArray(result.densityMatrix)).toBe(true);

      // Check that density matrix is square
      const size = result.densityMatrix.length;
      expect(size).toBe(Math.pow(2, circuit.numQubits));

      // Check that each row is the right length
      result.densityMatrix.forEach(row => {
        expect(row.length).toBe(size);
      });
    });

    it('should provide reduced states for each qubit', () => {
      const circuit: QuantumCircuit = {
        numQubits: 2,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'CNOT', qubits: [0, 1] }
        ]
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.reducedStates).toBeDefined();
      expect(result.reducedStates.length).toBe(circuit.numQubits);

      // Each reduced state should have Bloch vector
      result.reducedStates.forEach(state => {
        expect(state.blochVector).toBeDefined();
        expect(typeof state.blochVector.x).toBe('number');
        expect(typeof state.blochVector.y).toBe('number');
        expect(typeof state.blochVector.z).toBe('number');
      });
    });
  });

  describe('Complex Gate Combinations', () => {
    it('should handle multiple gates in sequence', () => {
      const circuit: QuantumCircuit = {
        numQubits: 1,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'Z', qubits: [0] },
          { name: 'H', qubits: [0] }
        ]
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      // H-Z-H should be equivalent to X gate
      expect(result.probabilities[0]).toBeCloseTo(0, 2);
      expect(result.probabilities[1]).toBeCloseTo(1, 2);
    });

    it('should handle mixed single and two-qubit gates', () => {
      const circuit: QuantumCircuit = {
        numQubits: 3,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'X', qubits: [2] },
          { name: 'CNOT', qubits: [0, 1] },
          { name: 'CNOT', qubits: [1, 2] }
        ]
      };

      const result = simulateCircuit(circuit);

      expect(result.error).toBeUndefined();
      expect(result.probabilities.length).toBe(8); // 2^3 = 8

      // Total probability should sum to 1
      const totalProb = result.probabilities.reduce((sum, p) => sum + p, 0);
      expect(totalProb).toBeCloseTo(1, 5);
    });
  });
});