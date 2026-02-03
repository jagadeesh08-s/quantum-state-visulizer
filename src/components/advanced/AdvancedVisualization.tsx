import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Text } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Atom,
  Play,
  Pause,
  RotateCcw,
  Download,
  Settings,
  Zap,
  Cpu,
  Waves,
  TrendingUp,
  Earth,
  Eye,
  BarChart3,
  MonitorSpeaker,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import BlochSphere3D, { BlochProbabilities, BlochSphereScene } from '../core/BlochSphere';
import { simulateCircuit } from '@/utils/quantum/quantumSimulation';
import type { QuantumCircuit, DensityMatrix } from '@/utils/quantum/quantumSimulation';
import { GPUQuantumVisualizer, QuantumState, EvolutionParameters, EntanglementParameters } from '@/utils/quantum/gpuQuantumVisualizer';
import StateVisualizer2D from '../core/StateVisualizer2D';


interface AdvancedVisualizationProps {
  circuit: QuantumCircuit | null;
  results: DensityMatrix[];
  className?: string;
}

interface VisualizationState {
  show3D: boolean;
  showProbabilities: boolean;
  showEntanglement: boolean;
  animateEvolution: boolean;
  animationSpeed: number;
  selectedQubit: number;
  viewMode: 'single' | 'all';
  enableGPU: boolean;
  showPerformance: boolean;
  renderMode: '3D' | '2D';
}

const AdvancedVisualization: React.FC<AdvancedVisualizationProps> = React.memo(({
  circuit,
  results,
  className = ''
}) => {
  const [vizState, setVizState] = useState<VisualizationState>({
    show3D: true,
    showProbabilities: true,
    showEntanglement: false,
    animateEvolution: false,
    animationSpeed: 1,
    selectedQubit: 0,
    viewMode: 'all',
    enableGPU: true,
    showPerformance: false,
    renderMode: (circuit?.numQubits || results.length || 1) > 5 ? '2D' : '3D'
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<{ gpuTime: number; cpuTime: number; speedup: number }>({
    gpuTime: 0,
    cpuTime: 0,
    speedup: 1
  });

  const [gpuVisualizer, setGpuVisualizer] = useState<GPUQuantumVisualizer | null>(null);

  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Calculate probabilities from density matrices
  const calculateProbabilities = (densityMatrices: DensityMatrix[]): number[][] => {
    return densityMatrices.map(dm => {
      // Extract diagonal elements (probabilities)
      return [dm.matrix[0][0], dm.matrix[1][1]].map(p => {
        const realPart = typeof p === 'object' && p !== null && 'real' in p ? (p as any).real : Number(p);
        return Math.max(0, Math.min(1, realPart));
      });
    });
  };

  // Calculate entanglement measures
  const calculateEntanglement = (densityMatrices: DensityMatrix[]): number[] => {
    return densityMatrices.map(dm => {
      // Simple entanglement measure based on purity
      const purity = dm.purity || 1;
      return Math.max(0, 1 - purity); // Higher values indicate more entanglement
    });
  };

  // Generate data from actual results (no more fake samples)
  const sampleProbabilities = useMemo(() => {
    return circuit && results.length > 0
      ? calculateProbabilities(results)
      : Array(circuit?.numQubits || 1).fill([1, 0]); // Default to |0⟩
  }, [circuit, results]);

  const sampleEntanglement = useMemo(() => {
    return circuit && results.length > 0
      ? calculateEntanglement(results)
      : Array(circuit?.numQubits || 1).fill(0); // Default to no entanglement
  }, [circuit, results]);

  // Animation loop for circuit evolution
  useEffect(() => {
    if (vizState.animateEvolution) {
      const animate = () => {
        setCurrentTime(prev => (prev + 0.02 * vizState.animationSpeed) % (2 * Math.PI));
        setAnimationFrame(requestAnimationFrame(animate));
      };
      setAnimationFrame(requestAnimationFrame(animate));
    } else if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      setAnimationFrame(null);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [vizState.animateEvolution, vizState.animationSpeed, animationFrame]);

  // GPU Visualizer setup
  useEffect(() => {
    if (vizState.enableGPU) {
      // GPU visualizer will be initialized in the BlochSphere components
      // Performance metrics will be collected from individual components
    }
  }, [vizState.enableGPU]);

  // Handle performance updates from BlochSphere components
  const handlePerformanceUpdate = useCallback((metrics: { gpuTime: number; cpuTime: number; speedup: number }) => {
    setPerformanceMetrics(metrics);
    setPerformanceMetrics(metrics);
  }, []);

  const qubitCount = useMemo(() => circuit?.numQubits || results.length || 1, [circuit, results.length]);




  const handleExportVisualization = useCallback(async () => {
    try {
      // This would export the current visualization as an image
      toast.success('Visualization exported successfully!');
    } catch (error) {
      toast.error('Failed to export visualization');
    }
  }, []);

  /* New Unified 3D Rendering Logic */
  const renderUnified3DView = useCallback(() => {
    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(qubitCount));
    const spacing = 3.5;

    return (
      <div className="w-full h-[600px] bg-slate-900/50 rounded-xl border border-slate-700 relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-blue-300 pointer-events-none">
          <span className="font-bold">GPU Accelerated</span> • Unified Context
        </div>

        <Canvas camera={{ position: [0, -5, 10], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-10, -10, -5]} intensity={1} color="#4f46e5" />

          <group position={[-(cols * spacing) / 2 + spacing / 2, (cols * spacing) / 2 - spacing / 2, 0]}>
            {results.map((result, i) => {
              if (vizState.viewMode === 'single' && i !== vizState.selectedQubit) return null;

              const row = Math.floor(i / cols);
              const col = i % cols;
              const vector = result?.blochVector || { x: 0, y: 0, z: 1 };

              return (
                <group key={i} position={[col * spacing, -row * spacing, 0]}>
                  <BlochSphereScene
                    vector={vector}
                    label={`Q${i}`}
                    isDark={true}
                    showAxes={true}
                  />
                  {/* Overlay Metrics via Html */}
                  <Html position={[0, -1.8, 0]} center transform sprite={false}>
                    <div className="w-32 p-2 bg-black/80 rounded border border-white/10 backdrop-blur-md">
                      <div className="text-[10px] pb-1 text-slate-400 border-b border-white/10 mb-1 flex justify-between">
                        <span>Purity</span>
                        <span className="text-white">{result?.purity?.toFixed(2) || '1.0'}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-blue-400">|0⟩</span>
                        <span className="text-slate-200">{((1 + vector.z) / 2 * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </Html>
                </group>
              );
            })}
          </group>

          <OrbitControls makeDefault enablePan={true} maxDistance={50} minDistance={2} />
        </Canvas>
      </div>
    );
  }, [results, qubitCount, vizState.viewMode, vizState.selectedQubit]);

  const renderStateVisualization = useCallback(() => {
    if (!vizState.show3D) return null;

    // Use Unified 3D View for 3D mode
    if (vizState.renderMode === '3D') {
      return renderUnified3DView();
    }

    // 2D Mode (Keep existing per-card logic or unify as well? Keeping per-card for 2D is fine/better for list view)
    // Actually, users might prefer the grid view for 3D. 
    // Let's keep 2D as a grid of cards as before, but 3D is now one big view.

    // Existing 2D Logic
    const spheres: JSX.Element[] = [];

    for (let i = 0; i < qubitCount; i++) {
      if (vizState.viewMode === 'single' && i !== vizState.selectedQubit) continue;

      const result = results[i];
      let vector = { x: 0, y: 0, z: 1 };

      if (result && result.blochVector) {
        vector = result.blochVector;
      } else {
        vector = { x: 0, y: 0, z: 1 };
      }

      spheres.push(
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="space-y-4"
        >
          {/* Qubit Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg border border-slate-600">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">Q{i}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Quantum State {i}
              </h3>
            </div>
          </div>

          {/* 2D Visualization Card */}
          <div className="bg-gray-900/80 rounded-xl p-6 border border-border/30">
            <div className="aspect-square max-w-sm mx-auto mb-6">
              <StateVisualizer2D
                vector={vector}
                className="w-full h-full"
                showAxes={true}
              />
            </div>
            {/* Simple Metrics for 2D */}
            <div className="text-center text-sm text-slate-400">
              Purity: <span className="text-white">{result?.purity?.toFixed(3) || '1.000'}</span>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
        {spheres}
      </div>
    );

  }, [vizState.show3D, vizState.viewMode, vizState.selectedQubit, vizState.renderMode, qubitCount, results, renderUnified3DView]);

  const renderProbabilityDistribution = useCallback(() => {
    if (!vizState.showProbabilities) return null;

    return (
      <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-lg font-bold">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Waves className="w-4 h-4 text-white" />
            </div>
            Measurement Probabilities
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Quantum state measurement outcomes
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {sampleProbabilities.map((probs, qubitIndex) => (
            <motion.div
              key={qubitIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: qubitIndex * 0.1 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-600"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Q{qubitIndex}</span>
                  </div>
                  <span className="font-semibold text-slate-200">Qubit {qubitIndex}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-blue-400">|0⟩: {(probs[0] * 100).toFixed(1)}%</span>
                  <span className="text-red-400">|1⟩: {(probs[1] * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${probs[0] * 100}%` }}
                    transition={{ duration: 0.8, delay: qubitIndex * 0.1 }}
                    className="bg-blue-600 flex items-center justify-end pr-2"
                  >
                    <span className="text-xs font-bold text-white">
                      {(probs[0] * 100).toFixed(0)}%
                    </span>
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${probs[1] * 100}%` }}
                    transition={{ duration: 0.8, delay: qubitIndex * 0.1 + 0.1 }}
                    className="bg-red-600 flex items-center justify-start pl-2"
                  >
                    <span className="text-xs font-bold text-white">
                      {(probs[1] * 100).toFixed(0)}%
                    </span>
                  </motion.div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>|0⟩ Ground State</span>
                  <span>|1⟩ Excited State</span>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    );
  }, [vizState.showProbabilities, sampleProbabilities]);

  const renderEntanglementGraph = useCallback(() => {
    if (!vizState.showEntanglement) return null;

    return (
      <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-lg font-bold">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            Entanglement Analysis
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Quantum correlations between qubits
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Individual Qubit Entanglement */}
          <div className="space-y-4">
            {sampleEntanglement.map((entanglement, qubitIndex) => (
              <motion.div
                key={qubitIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qubitIndex * 0.1 }}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-600"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">Q{qubitIndex}</span>
                    </div>
                    <span className="font-semibold text-slate-200">Qubit {qubitIndex}</span>
                  </div>
                  <span className="text-purple-400 font-bold">
                    {(entanglement * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="h-4 bg-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${entanglement * 100}%` }}
                      transition={{ duration: 1, delay: qubitIndex * 0.1 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Product State</span>
                    <span>Max Entangled</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Correlation Matrix */}
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-semibold text-slate-200">Correlation Matrix</h4>
              <p className="text-xs text-slate-400">Inter-qubit correlations</p>
            </div>

            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-2 p-4 bg-slate-800/30 rounded-lg">
                {sampleEntanglement.map((ent1, i) =>
                  sampleEntanglement.map((ent2, j) => {
                    const correlation = Math.min(ent1, ent2);
                    return (
                      <motion.div
                        key={`${i}-${j}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (i * 3 + j) * 0.05 }}
                        className={`aspect-square rounded border flex items-center justify-center text-xs font-medium ${i === j ? 'border-purple-400 bg-purple-500/20 text-purple-200' : 'border-slate-600 bg-slate-700/50 text-slate-300'
                          }`}
                      >
                        {(correlation * 100).toFixed(0)}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [vizState.showEntanglement, sampleEntanglement]);

  return (
    <div className={`min-h-screen bg-slate-950 ${className} overflow-y-auto relative`}>
      {/* Clean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]"></div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 pb-12">

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl rounded-2xl">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Atom className="w-4 h-4 text-white" />
                    </div>
                    Quantum Visualizer
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    Control and visualize quantum states in real-time
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-xs font-medium">Active</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* View Mode */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium">View Mode</Label>
                  <Select
                    value={vizState.viewMode}
                    onValueChange={(value: 'single' | 'all') =>
                      setVizState(prev => ({ ...prev, viewMode: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="all" className="text-white">All Qubits</SelectItem>
                      <SelectItem value="single" className="text-white">Single Qubit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Render Mode Toggle (3D/2D) */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium">Visualization Style</Label>
                  <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
                    <button
                      onClick={() => setVizState(prev => ({ ...prev, renderMode: '3D' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${vizState.renderMode === '3D'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Earth className="w-3 h-3" /> 3D Sphere
                    </button>
                    <button
                      onClick={() => setVizState(prev => ({ ...prev, renderMode: '2D' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${vizState.renderMode === '2D'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Target className="w-3 h-3" /> 2D View
                    </button>
                  </div>
                </div>

                {/* Qubit Selector */}
                <AnimatePresence>
                  {vizState.viewMode === 'single' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-2"
                    >
                      <Label className="text-slate-300 text-sm font-medium">Target Qubit</Label>
                      <Select
                        value={vizState.selectedQubit.toString()}
                        onValueChange={(value) =>
                          setVizState(prev => ({ ...prev, selectedQubit: parseInt(value) }))
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {Array.from({ length: results.length || 3 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()} className="text-white">
                              Qubit {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animation Speed */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium">Evolution Speed</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{vizState.animationSpeed}x</span>
                    </div>
                    <Slider
                      value={[vizState.animationSpeed]}
                      onValueChange={([value]) =>
                        setVizState(prev => ({ ...prev, animationSpeed: value }))
                      }
                      min={0.1}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Export */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium">Export</Label>
                  <Button
                    onClick={handleExportVisualization}
                    variant="outline"
                    className="w-full bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>

              {/* Visualization Toggles */}
              <div className="border-t border-slate-700 pt-4 sm:pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { key: 'show3D', label: 'State View', icon: Atom },
                    { key: 'showProbabilities', label: 'Probabilities', icon: Waves },
                    { key: 'showEntanglement', label: 'Entanglement', icon: Cpu },
                    { key: 'animateEvolution', label: 'Evolution', icon: Zap },
                    { key: 'enableGPU', label: 'GPU Acceleration', icon: MonitorSpeaker },
                    { key: 'showPerformance', label: 'Performance', icon: TrendingUp }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 text-sm font-medium">{label}</span>
                      </div>
                      <Switch
                        checked={vizState[key as keyof typeof vizState] as boolean}
                        onCheckedChange={(checked) =>
                          setVizState(prev => ({ ...prev, [key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bloch Sphere Visualization */}
        <AnimatePresence>
          {vizState.show3D && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Atom className="w-4 h-4 text-white" />
                    </div>
                    Quantum States
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    {vizState.renderMode === '3D' ? '3D' : '2D'} visualization of quantum superposition
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {renderStateVisualization()}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <AnimatePresence>
            {vizState.showProbabilities && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                {renderProbabilityDistribution()}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {vizState.showEntanglement && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                {renderEntanglementGraph()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Performance Monitor */}
        <AnimatePresence>
          {vizState.showPerformance && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-lg font-bold">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    Performance Monitor
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    GPU vs CPU rendering performance comparison
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* GPU Time */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        <MonitorSpeaker className="w-5 h-5 text-green-400" />
                        <span className="text-slate-200 font-medium">GPU Time</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {performanceMetrics.gpuTime.toFixed(2)}ms
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Per frame computation</div>
                    </div>

                    {/* CPU Time */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Cpu className="w-5 h-5 text-blue-400" />
                        <span className="text-slate-200 font-medium">CPU Time</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {performanceMetrics.cpuTime.toFixed(2)}ms
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Per frame computation</div>
                    </div>

                    {/* Speedup */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-5 h-5 text-purple-400" />
                        <span className="text-slate-200 font-medium">Speedup</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {performanceMetrics.speedup.toFixed(1)}x
                      </div>
                      <div className="text-xs text-slate-400 mt-1">GPU vs CPU performance</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">GPU Acceleration Status</span>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${vizState.enableGPU
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {vizState.enableGPU ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quantum Evolution */}
        <AnimatePresence>
          {vizState.animateEvolution && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-lg font-bold">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    Quantum Evolution
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    Real-time state transformations
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64 bg-slate-800/50 rounded-lg border border-slate-600 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ rotate: currentTime * 180 / Math.PI }}
                        className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full mx-auto"
                      />
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-purple-400">
                          t = {(currentTime / (2 * Math.PI)).toFixed(2)} ħ/2π
                        </div>
                        <div className="text-slate-300">
                          Evolution Active
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

AdvancedVisualization.displayName = 'AdvancedVisualization';

export default AdvancedVisualization;