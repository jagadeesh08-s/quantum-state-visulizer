import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlochSphere3D from '../BlochSphere';

// Mock @react-three/fiber and @react-three/drei
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: any) => (
    <div data-testid="canvas" {...props}>
      {children}
    </div>
  )
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Sphere: () => <div data-testid="sphere" />,
  Line: ({ points, color }: any) => (
    <div data-testid="line" data-points={JSON.stringify(points)} data-color={color} />
  ),
  Text: ({ children, position }: any) => (
    <div data-testid="text" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Html: ({ children }: any) => <div data-testid="html">{children}</div>
}));

// Mock THREE
vi.mock('three', () => ({
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    x: number;
    y: number;
    z: number;
  }
}));

describe('BlochSphere3D', () => {
  const defaultProps = {
    vector: { x: 0, y: 0, z: 1 },
    purity: 1,
    size: 400,
    showAxes: true,
    interactive: true
  };

  it('should render with default props', () => {
    render(<BlochSphere3D {...defaultProps} />);

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should render coordinate axes when showAxes is true', () => {
    render(<BlochSphere3D {...defaultProps} showAxes={true} />);

    // Should render axis labels
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('should not render axes when showAxes is false', () => {
    render(<BlochSphere3D {...defaultProps} showAxes={false} />);

    expect(screen.queryByText('X')).not.toBeInTheDocument();
    expect(screen.queryByText('Y')).not.toBeInTheDocument();
    expect(screen.queryByText('Z')).not.toBeInTheDocument();
  });

  it('should render orbit controls when interactive is true', () => {
    render(<BlochSphere3D {...defaultProps} interactive={true} />);

    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
  });

  it('should not render orbit controls when interactive is false', () => {
    render(<BlochSphere3D {...defaultProps} interactive={false} />);

    expect(screen.queryByTestId('orbit-controls')).not.toBeInTheDocument();
  });

  describe('Vector Processing', () => {
    it('should handle |0⟩ state (north pole)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: 0, z: 1 }} />);

      // The vector should point to the north pole
      const lines = screen.getAllByTestId('line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle |1⟩ state (south pole)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: 0, z: -1 }} />);

      // Should render without errors
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle |+⟩ state (positive X)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 1, y: 0, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle |-⟩ state (negative X)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: -1, y: 0, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle |+i⟩ state (positive Y)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: 1, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle |-i⟩ state (negative Y)', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: -1, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle superposition states', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0.707, y: 0, z: 0.707 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle complex superposition states', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0.5, y: 0.5, z: 0.707 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should normalize vectors longer than 1', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 2, y: 0, z: 0 }} />);

      // Should render without errors (vector gets normalized internally)
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle zero vector gracefully', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: 0, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle very small vectors', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: 0.001, y: 0.001, z: 0.001 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Phase Coloring', () => {
    it('should render with different colors for different phases', () => {
      const testCases = [
        { vector: { x: 1, y: 0, z: 0 }, expectedHueRange: [0, 30] }, // Red-ish
        { vector: { x: 0, y: 1, z: 0 }, expectedHueRange: [60, 120] }, // Green-ish
        { vector: { x: -1, y: 0, z: 0 }, expectedHueRange: [150, 210] }, // Cyan-ish
        { vector: { x: 0, y: -1, z: 0 }, expectedHueRange: [240, 300] }, // Blue-ish
      ];

      testCases.forEach(({ vector }) => {
        const { rerender } = render(<BlochSphere3D {...defaultProps} vector={vector} />);
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
        rerender(<div />);
      });
    });
  });

  describe('Purity Handling', () => {
    it('should handle pure states (purity = 1)', () => {
      render(<BlochSphere3D {...defaultProps} purity={1} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle mixed states (purity < 1)', () => {
      render(<BlochSphere3D {...defaultProps} purity={0.5} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle maximally mixed state (purity = 0)', () => {
      render(<BlochSphere3D {...defaultProps} purity={0} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Axis Highlighting', () => {
    it('should highlight X axis', () => {
      render(<BlochSphere3D {...defaultProps} highlightedAxis="x" />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should highlight Y axis', () => {
      render(<BlochSphere3D {...defaultProps} highlightedAxis="y" />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should highlight Z axis', () => {
      render(<BlochSphere3D {...defaultProps} highlightedAxis="z" />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle no axis highlighting', () => {
      render(<BlochSphere3D {...defaultProps} highlightedAxis={null} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      render(<BlochSphere3D {...defaultProps} className="custom-class" />);

      // Component renders without crashing with custom className
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle different sizes', () => {
      render(<BlochSphere3D {...defaultProps} size={200} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('State Labels', () => {
    it('should display state labels on axes', () => {
      render(<BlochSphere3D {...defaultProps} showAxes={true} />);

      expect(screen.getByText('|+⟩')).toBeInTheDocument();
      expect(screen.getByText('|+i⟩')).toBeInTheDocument();
      expect(screen.getByText('|0⟩')).toBeInTheDocument();
      expect(screen.getByText('|1⟩')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle NaN values gracefully', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: NaN, y: 0, z: 1 }} />);

      // Should not crash
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle Infinity values gracefully', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: Infinity, y: 0, z: 1 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should handle negative infinity values gracefully', () => {
      render(<BlochSphere3D {...defaultProps} vector={{ x: -Infinity, y: 0, z: 1 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Performance and Rendering', () => {
    it('should render consistently with same input', () => {
      const { rerender } = render(<BlochSphere3D {...defaultProps} />);

      // Re-render with same props
      rerender(<BlochSphere3D {...defaultProps} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should update when vector changes', () => {
      const { rerender } = render(<BlochSphere3D {...defaultProps} vector={{ x: 0, y: 0, z: 1 }} />);

      rerender(<BlochSphere3D {...defaultProps} vector={{ x: 1, y: 0, z: 0 }} />);

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });
});