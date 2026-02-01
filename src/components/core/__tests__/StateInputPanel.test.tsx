import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateInputPanel } from '../StateInputPanel';

// Mock BlochSphere3D component
vi.mock('../BlochSphere', () => ({
  default: ({ vector }: { vector: { x: number; y: number; z: number } }) => (
    <div data-testid="bloch-sphere" data-vector={JSON.stringify(vector)}>
      Bloch Sphere Mock
    </div>
  )
}));

describe('StateInputPanel', () => {
  const mockOnStateChange = vi.fn();

  const defaultProps = {
    onStateChange: mockOnStateChange,
    showBlochPreview: true,
    numQubits: 1
  };

  beforeEach(() => {
    mockOnStateChange.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render with default bra-ket notation', () => {
      render(<StateInputPanel {...defaultProps} />);

      expect(screen.getByText('State Input')).toBeTruthy();
      expect(screen.getByText('Bra-Ket Notation')).toBeTruthy();
    });

    it('should show computational basis states for 1 qubit', () => {
      render(<StateInputPanel {...defaultProps} numQubits={1} />);

      expect(screen.getByText('|0⟩')).toBeTruthy();
      expect(screen.getByText('|1⟩')).toBeTruthy();
    });

    it('should show computational basis states for 2 qubits', () => {
      render(<StateInputPanel {...defaultProps} numQubits={2} />);

      expect(screen.getByText('|00⟩')).toBeTruthy();
      expect(screen.getByText('|01⟩')).toBeTruthy();
      expect(screen.getByText('|10⟩')).toBeTruthy();
      expect(screen.getByText('|11⟩')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render without crashing', () => {
      render(<StateInputPanel {...defaultProps} />);
      expect(screen.getByText('State Input')).toBeTruthy();
    });

    it('should handle different qubit counts', () => {
      render(<StateInputPanel {...defaultProps} numQubits={3} />);
      // Should render 3-qubit basis states
      expect(screen.getByText('|000⟩')).toBeTruthy();
      expect(screen.getByText('|111⟩')).toBeTruthy();
    });

    it('should use gateQubitCount when provided', () => {
      render(<StateInputPanel {...defaultProps} numQubits={3} gateQubitCount={2} />);

      // Should show 2-qubit basis states instead of 3-qubit
      expect(screen.getByText('|00⟩')).toBeTruthy();
      expect(screen.getByText('|11⟩')).toBeTruthy();

      // Should not show 3-qubit states
      expect(screen.queryByText('|000⟩')).toBeFalsy();
    });
  });

  describe('Bloch Sphere Integration', () => {
    it('should not render Bloch sphere when showBlochPreview is false', () => {
      render(<StateInputPanel {...defaultProps} showBlochPreview={false} />);

      expect(screen.queryByTestId('bloch-sphere')).toBeFalsy();
    });
  });
});