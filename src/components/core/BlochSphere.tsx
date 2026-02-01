import React, { useRef, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface BlochVector {
  x: number;
  y: number;
  z: number;
}


interface BlochSphereProps {
  vector?: BlochVector;
  purity?: number;
  size?: number;
  className?: string;
  showAxes?: boolean;
  showGrid?: boolean;
  interactive?: boolean;
  highlightedAxis?: 'x' | 'y' | 'z' | null;
}

// --- Internal Components ---

// ProbabilityChart will be implemented as an HTML overlay in the main component

const QuantumStateMarker: React.FC<{ vector: BlochVector; isAtDefault: boolean }> = ({ vector, isAtDefault }) => {
  // "Q-Sphere" style marker (balloon/point on surface)
  // We place it exactly on the surface at the vector direction

  // Normalize to surface
  const len = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  const surfaceFactor = len > 0 ? 1 / len : 0;
  const surfaceX = vector.x * surfaceFactor;
  const surfaceY = vector.y * surfaceFactor;
  const surfaceZ = vector.z * surfaceFactor;

  // Determine Phase Color (Simple approximation based on x,y plane angle)
  // standard phi = atan2(y, x)
  // Map -PI..PI to a color wheel hue (hsl)
  const phase = Math.atan2(vector.y, vector.x); // -PI to PI
  // Map to 0-360
  const hue = ((phase * 180 / Math.PI) + 360) % 360;

  // If predominantly |0> or |1> (Z axis), phase color is less relevant visually but technically undefined/0
  // We'll just use the hue always for the marker color to mimic Q-sphere phase coloring
  const color = `hsl(${hue}, 100%, 60%)`;

  return (
    <group>
      {/* The Main Vector Arrow */}
      <Line
        points={[[0, 0, 0], [vector.x, vector.y, vector.z]]}
        color={color} // Use phase color for the line too? 
        // Or stick to Cyberpunk Cyan? Let's use Cyan for the rod, Phase color for the tip
        // color="#00ffff"
        lineWidth={3}
        transparent
        opacity={0.8}
      />

      {/* The "Q-Sphere" Marker on the surface */}
      <mesh position={[surfaceX, surfaceY, surfaceZ]}>
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          clearcoat={1}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Connecting line to surface if mixed state (inner) */}
      {len < 0.99 && (
        <Line
          points={[[vector.x, vector.y, vector.z], [surfaceX, surfaceY, surfaceZ]]}
          color={color}
          lineWidth={1}
          dashed
          dashScale={20}
        />
      )}
    </group>
  );
};

// Component for coordinate axes
const CoordinateAxes: React.FC<{ highlightedAxis?: 'x' | 'y' | 'z' | null }> = ({ highlightedAxis }) => {
  const getAxisColor = (axis: 'x' | 'y' | 'z') => {
    if (highlightedAxis === axis) return '#ffff00';
    return '#444'; // Darker, subtler axes to match "clean" look
  };

  return (
    <group>
      {/* X-axis */}
      <Line points={[[-1.1, 0, 0], [1.1, 0, 0]]} color={getAxisColor('x')} lineWidth={1} transparent opacity={0.5} />
      <Text position={[1.2, 0, 0]} fontSize={0.1} color={getAxisColor('x')}>X</Text>
      <Text position={[0.6, 0.1, 0]} fontSize={0.08} color="#aaa">|+⟩</Text>

      {/* Y-axis */}
      <Line points={[[0, -1.1, 0], [0, 1.1, 0]]} color={getAxisColor('y')} lineWidth={1} transparent opacity={0.5} />
      <Text position={[0, 1.2, 0]} fontSize={0.1} color={getAxisColor('y')}>Y</Text>
      <Text position={[0.1, 0.6, 0]} fontSize={0.08} color="#aaa">|+i⟩</Text>

      {/* Z-axis */}
      <Line points={[[0, 0, -1.1], [0, 0, 1.1]]} color={getAxisColor('z')} lineWidth={1} transparent opacity={0.5} />
      <Text position={[0, 0, 1.2]} fontSize={0.1} color={getAxisColor('z')}>Z</Text>
      <Text position={[0.1, 0, 1.05]} fontSize={0.08} color="#aaa">|0⟩</Text>
      <Text position={[0.1, 0, -1.05]} fontSize={0.08} color="#aaa">|1⟩</Text>
    </group>
  );
};

// Main Bloch Sphere component - Memoized for performance
const BlochSphere3D: React.FC<BlochSphereProps> = React.memo(({
  vector = { x: 0, y: 0, z: 1 },
  purity = 1,
  className = "",
  showAxes = true,
  interactive = true,
  highlightedAxis = null
}) => {
  const [hovered, setHovered] = useState(false);

  // Vector Processing - Optimized with useMemo
  const displayVector = useMemo(() => {
    const rawLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
    if (rawLen < 0.001) return { x: 0, y: 0, z: 0 };
    // Clamp
    const scale = rawLen > 1 ? 1 / rawLen : 1;
    return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
  }, [vector.x, vector.y, vector.z]); // More specific dependencies

  const isAtDefault = useMemo(() =>
    Math.abs(vector.x) < 0.01 && Math.abs(vector.y) < 0.01 && Math.abs(vector.z - 1) < 0.01,
    [vector.x, vector.y, vector.z]
  );

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gradient-to-b from-[#0a0a1a] to-[#000] border border-white/5 shadow-2xl group flex flex-row ${className}`}
      style={{
        width: '100%',
        height: '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative flex-1 min-w-[300px] h-full">
        <Canvas
          camera={{ position: [2.5, 1.5, 3.5], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#4fc3f7" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />

          {showAxes && <CoordinateAxes highlightedAxis={highlightedAxis} />}

          {/* Probability Chart Overlay - Commented out to avoid WebGL issues */}
          {/* <Html position={[-1.2, 1.2, 0]} transform={false} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
            <div className={`w-28 bg-black/60 backdrop-blur-md rounded-lg p-2 border border-cyan-500/20 text-[10px] font-mono shadow-lg select-none transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-70'} pointer-events-auto origin-top-left -translate-x-1/2 -translate-y-1/2 scale-90`}>
              <h3 className="text-cyan-400 mb-1.5 font-bold flex items-center justify-between text-[9px]">
                <span>Probabilities</span>
              </h3>
              <div className="space-y-1.5">
                <div className="group">
                  <div className="flex justify-between mb-0.5 text-gray-300">
                    <span>|0⟩</span>
                    <span>{(Math.max(0, Math.min(1, (1 + displayVector.z) / 2)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                      style={{ width: `${Math.max(0, Math.min(1, (1 + displayVector.z) / 2)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between mb-0.5 text-gray-300">
                    <span>|1⟩</span>
                    <span>{(Math.max(0, Math.min(1, (1 - displayVector.z) / 2)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                      style={{ width: `${Math.max(0, Math.min(1, (1 - displayVector.z) / 2)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Html> */}

          {/* --- SPHERE AESTHETICS (Glassy look) --- */}
          <group>
            {/* Wireframe - subtle */}
            <mesh>
              <sphereGeometry args={[1, 32, 24]} />
              <meshBasicMaterial
                color="#334155" // Slate-700
                wireframe
                transparent
                opacity={0.15}
              />
            </mesh>

            {/* Glass Surface - inner glow */}
            <mesh>
              <sphereGeometry args={[0.99, 64, 64]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.1}
              />
            </mesh>

            {/* Equator Line */}
            <Line
              points={new Array(65).fill(0).map((_, i) => {
                const angle = (i / 64) * Math.PI * 2;
                return [Math.cos(angle), Math.sin(angle), 0] as [number, number, number];
              })}
              color="#ffffff"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
          </group>

          {/* State Marker & Vector */}
          <QuantumStateMarker vector={displayVector} isAtDefault={isAtDefault} />

          {interactive && <OrbitControls enablePan={false} maxDistance={10} minDistance={2} />}
        </Canvas>

        {/* Simple Phase Legend Overlay - Outside Canvas */}
        <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 font-mono flex flex-col items-end pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span>Phase</span>
            <div className="w-12 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-70"></div>
          </div>
          <div className="whitespace-nowrap opacity-60">Drag • Zoom</div>
        </div>
      </div>
    </div >
  );
});

BlochSphere3D.displayName = 'BlochSphere3D';

export default BlochSphere3D;
export type { BlochVector };