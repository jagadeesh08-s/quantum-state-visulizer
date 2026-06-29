import React from 'react';
// Removed motion import to disable animations
import { Grip } from 'lucide-react';

export interface GateProps {
  name: string;
  type: 'single' | 'double' | 'triple';
  color: string;
  symbol: string;
  description: string;
  parameters?: { [key: string]: number }; // Add optional parameters for gates
}

export const QUANTUM_GATES: GateProps[] = [
  // Pauli Gates
  { name: 'I', type: 'single', color: 'bg-gray-500', symbol: 'I', description: 'Identity' },
  { name: 'X', type: 'single', color: 'bg-red-500', symbol: 'X', description: 'Pauli-X (NOT)' },
  { name: 'Y', type: 'single', color: 'bg-green-500', symbol: 'Y', description: 'Pauli-Y' },
  { name: 'Z', type: 'single', color: 'bg-blue-500', symbol: 'Z', description: 'Pauli-Z' },
  
  // Hadamard and Phase Gates
  { name: 'H', type: 'single', color: 'bg-purple-500', symbol: 'H', description: 'Hadamard' },
  { name: 'S', type: 'single', color: 'bg-pink-500', symbol: 'S', description: 'Phase (S)' },
  { name: 'T', type: 'single', color: 'bg-indigo-500', symbol: 'T', description: 'T Gate' },
  
  // Rotation Gates with default parameter
  { name: 'RX', type: 'single', color: 'bg-orange-500', symbol: 'Rx', description: 'Rotation-X', parameters: { angle: Math.PI / 2 } },
  { name: 'RY', type: 'single', color: 'bg-teal-500', symbol: 'Ry', description: 'Rotation-Y', parameters: { angle: Math.PI / 2 } },
  { name: 'RZ', type: 'single', color: 'bg-cyan-500', symbol: 'Rz', description: 'Rotation-Z', parameters: { angle: Math.PI / 2 } },
  
  // Two-Qubit Gates
  { name: 'CNOT', type: 'double', color: 'bg-amber-500', symbol: '⊕', description: 'Controlled-X' },
  { name: 'CZ', type: 'double', color: 'bg-emerald-500', symbol: '●Z', description: 'Controlled-Z' },
  { name: 'SWAP', type: 'double', color: 'bg-rose-500', symbol: '⤫', description: 'Swap' },
  { name: 'CY', type: 'double', color: 'bg-lime-500', symbol: '●Y', description: 'Controlled-Y' },
  { name: 'CH', type: 'double', color: 'bg-violet-500', symbol: '●H', description: 'Controlled-H' },
  { name: 'RXX', type: 'double', color: 'bg-slate-500', symbol: 'Rxx', description: 'Rotation-XX', parameters: { angle: Math.PI / 4 } },
  { name: 'RYY', type: 'double', color: 'bg-stone-500', symbol: 'Ryy', description: 'Rotation-YY', parameters: { angle: Math.PI / 4 } },
  { name: 'RZZ', type: 'double', color: 'bg-neutral-500', symbol: 'Rzz', description: 'Rotation-ZZ', parameters: { angle: Math.PI / 4 } },

  // Additional Single-Qubit Gates
  { name: 'SQRTX', type: 'single', color: 'bg-yellow-600', symbol: '√X', description: 'Square Root X' },
  { name: 'SQRTY', type: 'single', color: 'bg-green-600', symbol: '√Y', description: 'Square Root Y' },
  { name: 'SQRTZ', type: 'single', color: 'bg-blue-600', symbol: '√Z', description: 'Square Root Z' },
  { name: 'P', type: 'single', color: 'bg-purple-600', symbol: 'P', description: 'Phase Gate', parameters: { phi: Math.PI / 4 } },

  // Three-Qubit Gates
  { name: 'CCNOT', type: 'triple', color: 'bg-red-600', symbol: '⊕⊕', description: 'Toffoli (CCNOT)' },
  { name: 'FREDKIN', type: 'triple', color: 'bg-orange-600', symbol: '⤫●', description: 'Fredkin (CSWAP)' },
];

interface QuantumGateBlockProps {
  gate: GateProps;
  onDragStart?: (gate: GateProps) => void;
  className?: string;
}

export const QuantumGateBlock: React.FC<QuantumGateBlockProps> = ({ 
  gate, 
  onDragStart,
  className = ''
}) => {
  return (
    <div
      className={`${className} cursor-grab active:cursor-grabbing select-none`}
    >
      <div className={`
        relative p-3 rounded-lg border-2 border-primary/20 
        bg-card hover:bg-muted border border-border shadow-sm hover:shadow-md hover:scale-[1.02]
        transition-all duration-200 group hover:bg-card/70
      `}
        draggable
        onDragStart={(e) => {
          try { e.dataTransfer.setData('application/x-quantum-gate', gate.name); } catch { void 0; }
          e.dataTransfer.effectAllowed = 'copy';
          onDragStart?.(gate);
        }}
        onDragEnd={() => {
          // Clear any drag state when drag ends
          document.body.style.cursor = '';
        }}
      >
        {/* Drag handle */}
        <div className="absolute top-1 right-1 opacity-50 group-hover:opacity-100 transition-opacity">
          <Grip className="w-3 h-3 text-muted-foreground" />
        </div>
        
        {/* Gate visualization */}
        <div className="flex flex-col items-center space-y-2">
          <div className={`
            w-12 h-12 rounded-md ${gate.color} 
            flex items-center justify-center text-white font-bold text-lg
            shadow-lg relative overflow-hidden
          `}>
            {/* Gate symbol */}
            <span className="relative z-10">{gate.symbol}</span>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Gate info */}
          <div className="text-center">
            <div className="text-sm font-semibold text-primary">{gate.name}</div>
            <div className="text-xs text-muted-foreground">{gate.description}</div>
            <div className="text-xs text-accent mt-1">
              {gate.type === 'single' ? '1-qubit' : gate.type === 'double' ? '2-qubit' : '3-qubit'}
            </div>
            <div className="text-xs text-muted-foreground mt-1 opacity-75">
              Drag to canvas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantumGateBlock;