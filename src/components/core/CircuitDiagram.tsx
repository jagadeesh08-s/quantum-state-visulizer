import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type QuantumCircuit } from '@/utils/quantumCodeParser';

interface CircuitDiagramProps {
  circuit: QuantumCircuit;
  className?: string;
}

interface GatePosition {
  gate: string;
  qubits: number[];
  position: number;
  color: string;
  symbol: string;
}

const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ circuit, className = '' }) => {
  // Gate colors and symbols
  const gateStyles = {
    H: { color: '#8B5CF6', symbol: 'H' },
    X: { color: '#EF4444', symbol: 'X' },
    Y: { color: '#10B981', symbol: 'Y' },
    Z: { color: '#3B82F6', symbol: 'Z' },
    S: { color: '#EC4899', symbol: 'S' },
    T: { color: '#6366F1', symbol: 'T' },
    RX: { color: '#F97316', symbol: 'Rx' },
    RY: { color: '#14B8A6', symbol: 'Ry' },
    RZ: { color: '#06B6D4', symbol: 'Rz' },
    CNOT: { color: '#F59E0B', symbol: '⊕' },
    CZ: { color: '#10B981', symbol: '●Z' },
    SWAP: { color: '#F43F5E', symbol: '⤫' },
    I: { color: '#6B7280', symbol: 'I' }
  };

  // Calculate gate positions
  const gatePositions = useMemo(() => {
    const positions: GatePosition[] = [];
    const qubitTimeline: number[][] = Array(circuit.numQubits).fill(0).map(() => []);

    circuit.gates.forEach((gate, index) => {
      const maxPosition = Math.max(...gate.qubits.map(q => qubitTimeline[q].length));
      const gatePosition = maxPosition;

      // Add gate to all affected qubits
      gate.qubits.forEach(qubit => {
        qubitTimeline[qubit][gatePosition] = index;
      });

      positions.push({
        gate: gate.name,
        qubits: gate.qubits,
        position: gatePosition,
        color: gateStyles[gate.name as keyof typeof gateStyles]?.color || '#6B7280',
        symbol: gateStyles[gate.name as keyof typeof gateStyles]?.symbol || gate.name
      });
    });

    return positions;
  }, [circuit]);

  // Calculate circuit width
  const circuitWidth = useMemo(() => {
    const maxPosition = Math.max(...gatePositions.map(g => g.position), 0);
    return Math.max(maxPosition + 1, 3) * 120 + 200; // 120px per gate + padding
  }, [gatePositions]);

  // Render single qubit gate
  const renderSingleQubitGate = (gate: GatePosition, qubitIndex: number) => (
    <motion.div
      key={`${gate.gate}-${qubitIndex}-${gate.position}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: gate.position * 0.1 }}
      className="absolute flex items-center justify-center"
      style={{
        left: gate.position * 120 + 100,
        top: qubitIndex * 80 + 40,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/20"
        style={{ backgroundColor: gate.color }}
      >
        {gate.symbol}
      </div>
    </motion.div>
  );

  // Render two qubit gate
  const renderTwoQubitGate = (gate: GatePosition) => {
    const [controlQubit, targetQubit] = gate.qubits;
    const controlY = controlQubit * 80 + 40;
    const targetY = targetQubit * 80 + 40;
    const x = gate.position * 120 + 100;

    return (
      <motion.div
        key={`${gate.gate}-${gate.position}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: gate.position * 0.1 }}
        className="absolute"
        style={{ left: x, transform: 'translateX(-50%)' }}
      >
        {/* Control qubit dot */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg"
          style={{
            backgroundColor: gate.color,
            top: controlY - 8,
            left: -8
          }}
        />
        
        {/* Target qubit gate */}
        <div
          className="absolute w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/20"
          style={{
            backgroundColor: gate.color,
            top: targetY - 24,
            left: -24
          }}
        >
          {gate.symbol}
        </div>

        {/* Connection line */}
        <div
          className="absolute w-0.5"
          style={{
            backgroundColor: gate.color,
            top: Math.min(controlY, targetY),
            left: -2,
            height: Math.abs(targetY - controlY)
          }}
        />
      </motion.div>
    );
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <Card className="solid-panel">
        <CardContent className="p-6">
          <div className="relative" style={{ width: circuitWidth, height: circuit.numQubits * 80 + 100 }}>
            {/* Qubit lines */}
            {Array.from({ length: circuit.numQubits }, (_, index) => (
              <div key={index} className="absolute flex items-center">
                {/* Qubit label */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
                  <Badge variant="outline" className="text-xs font-mono">
                    |{index}⟩
                  </Badge>
                </div>
                
                {/* Qubit line */}
                <div
                  className="absolute h-0.5 bg-primary/60"
                  style={{
                    left: 60,
                    top: index * 80 + 40,
                    width: circuitWidth - 120
                  }}
                />
                
                {/* Measurement line */}
                <div
                  className="absolute h-0.5 bg-accent/60"
                  style={{
                    left: circuitWidth - 60,
                    top: index * 80 + 40,
                    width: 40
                  }}
                />
                
                {/* Measurement symbol */}
                <div
                  className="absolute flex items-center justify-center w-8 h-8 bg-accent/20 rounded-full border-2 border-accent/40"
                  style={{
                    left: circuitWidth - 40,
                    top: index * 80 + 24
                  }}
                >
                  <div className="w-0 h-4 border-l-2 border-accent"></div>
                </div>
              </div>
            ))}

            {/* Render gates */}
            {gatePositions.map((gate) => {
              if (gate.qubits.length === 1) {
                return renderSingleQubitGate(gate, gate.qubits[0]);
              } else {
                return renderTwoQubitGate(gate);
              }
            })}

            {/* Circuit info overlay */}
            <div className="absolute top-0 right-0 bg-background rounded-lg p-3 border border-border">
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-semibold">Qubits: {circuit.numQubits}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="font-semibold">Gates: {circuit.gates.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-semibold">Depth: {Math.max(...gatePositions.map(g => g.position), 0) + 1}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gate legend */}
          <div className="mt-6 pt-4 border-t border-primary/20">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Gate Legend</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(gateStyles).map(([name, style]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-4 rounded text-white text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: style.color }}
                  >
                    {style.symbol}
                  </div>
                  <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CircuitDiagram;
