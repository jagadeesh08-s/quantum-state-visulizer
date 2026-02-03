import React, { useRef, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

import { useTheme } from '@/components/general/ThemeProvider';

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

interface BlochSphereSceneProps extends BlochSphereProps {
  position?: [number, number, number];
  label?: string;
  isDark?: boolean;
}

// --- Internal Components ---

const QuantumStateMarker = React.memo<{ vector: BlochVector; isAtDefault: boolean }>(({ vector }) => {
  // "Q-Sphere" style marker (balloon/point on surface or inside)
  // We place it exactly at the vector direction (might be inside if mixed state)

  // Memoize expensive calculations
  const { x, y, z, color } = useMemo(() => {
    const x = vector.x;
    const y = vector.y;
    const z = vector.z;

    // Determine Phase Color (Simple approximation based on x,y plane angle)
    const phase = Math.atan2(vector.y, vector.x); // -PI to PI
    const hue = ((phase * 180 / Math.PI) + 360) % 360;
    const color = `hsl(${hue}, 100%, 60%)`;

    return { x, y, z, color };
  }, [vector.x, vector.y, vector.z]);

  // Memoize geometry args
  const sphereArgs = useMemo(() => [0.08, 16, 16] as [number, number, number], []);
  const glowArgs = useMemo(() => [0.12, 16, 16] as [number, number, number], []);

  return (
    <group>
      {/* The Main Vector Arrow - Glowing Neon Style */}
      <Line
        points={[[0, 0, 0], [x, y, z]]}
        color={color}
        lineWidth={3}
        transparent
        opacity={1}
      />
      {/* Inner glow line for core */}
      <Line
        points={[[0, 0, 0], [x, y, z]]}
        color="#ffffff"
        lineWidth={1}
        transparent
        opacity={0.8}
      />

      {/* The "Qubit" Marker - Glowing Sphere at the tip */}
      <mesh position={[x, y, z]}>
        <sphereGeometry args={sphereArgs} />
        <meshBasicMaterial
          color={color}
        />
      </mesh>
      {/* Outer glow for marker */}
      <mesh position={[x, y, z]}>
        <sphereGeometry args={glowArgs} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return prevProps.vector.x === nextProps.vector.x &&
    prevProps.vector.y === nextProps.vector.y &&
    prevProps.vector.z === nextProps.vector.z &&
    prevProps.isAtDefault === nextProps.isAtDefault;
});

// Component for coordinate axes with clear labels and bold styling
const CoordinateAxes: React.FC<{ highlightedAxis?: 'x' | 'y' | 'z' | null; themeColors: any }> = ({ highlightedAxis }) => {
  const axisColors = {
    x: '#ff1a1a', // Bold Red
    y: '#00cc44', // Bold Green
    z: '#2e8fff'  // Bold Blue
  };

  const AxisLine = ({ start, end, color, label, labelPos }: any) => (
    <group>
      <Line
        points={[start, end]}
        color={color}
        lineWidth={4}
        transparent
        opacity={1}
        depthTest={false} // Always show on top of sphere
        renderOrder={999}
      />
      <Text
        position={labelPos}
        fontSize={0.25}
        color={color}
        fontWeight="extra-bold"
        anchorX="center"
        anchorY="middle"
        renderOrder={1000}
      >
        {label}
      </Text>
    </group>
  );

  return (
    <group>
      {/* X-axis (Red) */}
      <AxisLine start={[-1.4, 0, 0] as [number, number, number]} end={[1.4, 0, 0] as [number, number, number]} color={axisColors.x} label="X" labelPos={[1.6, 0, 0]} />
      {/* Y-axis (Green) */}
      <AxisLine start={[0, -1.4, 0] as [number, number, number]} end={[0, 1.4, 0] as [number, number, number]} color={axisColors.y} label="Y" labelPos={[0, 1.6, 0]} />
      {/* Z-axis (Blue) */}
      <AxisLine start={[0, 0, -1.4] as [number, number, number]} end={[0, 0, 1.4] as [number, number, number]} color={axisColors.z} label="Z" labelPos={[0, 0, 1.6]} />

      {/* Basis State Labels */}
      <Text position={[0.2, 0, 1.15]} fontSize={0.12} color={axisColors.z} fontWeight="bold" renderOrder={1000}>|0⟩</Text>
      <Text position={[0.2, 0, -1.15]} fontSize={0.12} color={axisColors.z} fontWeight="bold" renderOrder={1000}>|1⟩</Text>
      <Text position={[1.15, 0.15, 0]} fontSize={0.10} color={axisColors.x} renderOrder={1000}>|+⟩</Text>

      {/* Origin */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

export const BlochSphereScene: React.FC<BlochSphereSceneProps> = React.memo(({
  vector = { x: 0, y: 0, z: 1 },
  position = [0, 0, 0] as [number, number, number],
  label,
  isDark = true,
  showAxes = true,
  highlightedAxis = null
}) => {
  // Theme-derived Colors
  const colors = useMemo(() => ({
    background: isDark ? '#040b19' : '#ffffff',
    grid: isDark ? '#ffffff' : '#000000',
    sphereColor: isDark ? '#001133' : '#e0f2fe',
    sphereTransmission: 0.1,
    lightIntensity: isDark ? 2.5 : 1.5,
  }), [isDark]);

  const axisColors = {
    x: '#ff1a1a',
    y: '#00cc44',
    z: '#2e8fff'
  };

  // Vector Processing
  const displayVector = useMemo(() => {
    const rawLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
    if (rawLen < 0.001) return { x: 0, y: 0, z: 0 };
    const scale = rawLen > 1 ? 1 / rawLen : 1;
    return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
  }, [vector.x, vector.y, vector.z]);

  const isAtDefault = useMemo(() =>
    Math.abs(vector.x) < 0.01 && Math.abs(vector.y) < 0.01 && Math.abs(vector.z - 1) < 0.01,
    [vector.x, vector.y, vector.z]
  );

  return (
    <group position={position}>
      {showAxes && (
        <group>
          <CoordinateAxes highlightedAxis={highlightedAxis} themeColors={colors} />
        </group>
      )}

      {/* --- THE SPHERE --- */}
      <group>
        {/* 1. Wireframe */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={colors.grid}
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>

        {/* 2. Glass Surface Body */}
        <mesh>
          <sphereGeometry args={[0.99, 32, 32]} /> {/* Reduced segments for performance in grid */}
          <meshPhongMaterial
            color="#000000"
            emissive="#001a33"
            emissiveIntensity={0.2}
            specular="#111111"
            shininess={100}
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Equator Line */}
        <Line
          points={new Array(33).fill(0).map((_, i) => { // Reduced points
            const angle = (i / 32) * Math.PI * 2;
            return [Math.cos(angle), Math.sin(angle), 0] as [number, number, number];
          })}
          color={colors.grid}
          lineWidth={1.5}
          transparent
          opacity={0.5}
        />
      </group>

      {/* State Marker & Vector */}
      <QuantumStateMarker vector={displayVector} isAtDefault={isAtDefault} />

      {/* Label */}
      {label && (
        <Text
          position={[0, -1.3, 0]}
          fontSize={0.2}
          color={isDark ? "#cbd5e1" : "#475569"}
          anchorX="center"
          anchorY="top"
        >
          {label}
        </Text>
      )}
    </group>
  );
});

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
  const { theme } = useTheme();

  // Determine if we are in a dark theme or light theme
  const isDark = theme === 'quantum-dark' || theme === 'cosmic' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme-derived Colors for container
  const colors = {
    background: isDark ? '#040b19' : '#ffffff',
    lightIntensity: isDark ? 2.5 : 1.5,
  };

  // Calculate annotation for overlay
  const displayVector = useMemo(() => {
    const rawLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
    if (rawLen < 0.001) return { x: 0, y: 0, z: 0 };
    const scale = rawLen > 1 ? 1 / rawLen : 1;
    return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
  }, [vector.x, vector.y, vector.z]);

  const stateAnnotation = useMemo(() => {
    const theta = Math.acos(Math.max(-1, Math.min(1, displayVector.z)));
    const phi = Math.atan2(displayVector.y, displayVector.x);
    const alphaVal = Math.cos(theta / 2);
    const betaMag = Math.sin(theta / 2);
    const alphaStr = alphaVal.toFixed(2);
    const betaStr = betaMag.toFixed(2);
    const phiDeg = (phi * 180 / Math.PI).toFixed(0);
    return { alphaStr, betaStr, phiDeg };
  }, [displayVector]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-2xl border ${isDark ? 'border-white/10' : 'border-black/5'} ${className}`}
      style={{
        width: '100%',
        height: '100%',
        background: colors.background,
        boxShadow: isDark ? 'inset 0 0 50px rgba(0,0,0,0.5)' : 'inset 0 0 20px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative flex-1 min-w-[300px] h-full">
        <Canvas
          camera={{ position: [2.5, 1.5, 3.0], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Dynamic Lighting */}
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={colors.lightIntensity} color="#ffffff" />
          <pointLight position={[-8, 5, -5]} intensity={0.8} color="#a5f3fc" />
          <pointLight position={[0, -8, 0]} intensity={0.5} color="#e879f9" />

          <BlochSphereScene
            vector={vector}
            isDark={isDark}
            showAxes={showAxes}
            highlightedAxis={highlightedAxis}
          />

          {interactive && <OrbitControls enablePan={false} maxDistance={8} minDistance={1.5} autoRotate autoRotateSpeed={2} />}
        </Canvas>

        {/* Measurement Probabilities Overlay */}
        <div className={`absolute bottom-4 left-4 p-3 rounded-lg backdrop-blur-md border ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/5'} shadow-lg transition-all duration-300 pointer-events-none select-none z-10`}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>|0⟩</span>
              <span className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{(parseFloat(stateAnnotation.alphaStr) ** 2 * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>|1⟩</span>
              <span className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{(parseFloat(stateAnnotation.betaStr) ** 2 * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Legend Overlay */}
        <div className={`absolute bottom-4 right-4 text-[10px] font-mono flex flex-col items-end pointer-events-none select-none ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span>Phase</span>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-80"></div>
          </div>
          <div className="opacity-60">Interactive View</div>
        </div>
      </div>
    </div >
  );
});

export const BlochProbabilities: React.FC<{ vector: BlochVector; isDark?: boolean; className?: string }> = ({ vector, isDark = true, className = "" }) => {
  // Logic to calculate probabilities
  const rawLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  const scale = rawLen > 1 ? 1 / rawLen : 1;
  const displayVector = { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };

  const theta = Math.acos(Math.max(-1, Math.min(1, displayVector.z)));
  const alphaVal = Math.cos(theta / 2);
  const betaMag = Math.sin(theta / 2);

  return (
    <div className={`p-3 rounded-lg border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/5'} ${className}`}>
      <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Measurement Probabilities <span className="text-[10px] font-normal opacity-70">(Z-Basis)</span></div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1 gap-4">
            <span className={`${isDark ? 'text-gray-400' : 'text-slate-600'} font-medium`}>|0⟩</span>
            <span className={`${isDark ? 'text-blue-300' : 'text-blue-700'} font-mono`}>{(alphaVal * alphaVal * 100).toFixed(1)}%</span>
          </div>
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${alphaVal * alphaVal * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1 gap-4">
            <span className={`${isDark ? 'text-gray-400' : 'text-slate-600'} font-medium`}>|1⟩</span>
            <span className={`${isDark ? 'text-purple-300' : 'text-purple-700'} font-mono`}>{(betaMag * betaMag * 100).toFixed(1)}%</span>
          </div>
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${betaMag * betaMag * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

BlochSphere3D.displayName = 'BlochSphere3D';

export default BlochSphere3D;
export type { BlochVector };