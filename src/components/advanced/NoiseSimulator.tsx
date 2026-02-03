import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Square,
  TrendingUp,
  Target,
  Zap,
  Shield,
  AlertTriangle,
  Calculator,
  BarChart3,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
  Cpu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';

interface NoiseModel {
  name: string;
  description: string;
  type: 'coherent' | 'incoherent' | 'mixed';
  parameters: {
    t1: number; // T1 relaxation time (μs)
    t2: number; // T2 dephasing time (μs)
    gateError: number; // Gate error rate
    readoutError: number; // Measurement error rate
    crosstalk: number; // Crosstalk strength
    temperature?: number; // Device temperature (K)
  };
}

interface ErrorMitigation {
  name: string;
  description: string;
  type: 'readout' | 'gate' | 'coherence';
  effectiveness: number;
  overhead: number;
}

interface SimulationResult {
  id: string;
  circuit: any;
  noiseModel: NoiseModel;
  mitigation: ErrorMitigation | null;
  fidelity: number;
  errorRate: number;
  mitigatedFidelity: number;
  executionTime: number;
  timestamp: Date;
}

const NOISE_MODELS: NoiseModel[] = [
  {
    name: 'IBM Guadalupe',
    description: 'Realistic noise model based on IBM Guadalupe quantum processor',
    type: 'mixed',
    parameters: {
      t1: 50,
      t2: 60,
      gateError: 0.001,
      readoutError: 0.02,
      crosstalk: 0.005
    }
  },
  {
    name: 'Ion Trap',
    description: 'Trapped ion quantum computer noise characteristics',
    type: 'coherent',
    parameters: {
      t1: 1000,
      t2: 500,
      gateError: 0.0001,
      readoutError: 0.001,
      crosstalk: 0.0001
    }
  },
  {
    name: 'Superconducting',
    description: 'Typical superconducting qubit noise model',
    type: 'incoherent',
    parameters: {
      t1: 30,
      t2: 25,
      gateError: 0.005,
      readoutError: 0.01,
      crosstalk: 0.01
    }
  },
  {
    name: 'Custom',
    description: 'User-defined noise parameters',
    type: 'mixed',
    parameters: {
      t1: 100,
      t2: 80,
      gateError: 0.002,
      readoutError: 0.015,
      crosstalk: 0.003
    }
  }
];

const ERROR_MITIGATION: ErrorMitigation[] = [
  {
    name: 'Readout Error Mitigation',
    description: 'Correct measurement errors using calibration matrices',
    type: 'readout',
    effectiveness: 0.85,
    overhead: 1.2
  },
  {
    name: 'Zero-Noise Extrapolation',
    description: 'Extrapolate to zero noise using multiple noise levels',
    type: 'gate',
    effectiveness: 0.75,
    overhead: 3.0
  },
  {
    name: 'Randomized Compiling',
    description: 'Average over random gate decompositions',
    type: 'gate',
    effectiveness: 0.65,
    overhead: 1.5
  },
  {
    name: 'Dynamical Decoupling',
    description: 'Apply pulse sequences to suppress decoherence',
    type: 'coherence',
    effectiveness: 0.70,
    overhead: 2.0
  }
];

export const NoiseSimulator: React.FC = () => {
  const [selectedNoiseModel, setSelectedNoiseModel] = useState<NoiseModel>(NOISE_MODELS[0]);
  const [selectedMitigation, setSelectedMitigation] = useState<ErrorMitigation | null>(null);
  const [customParameters, setCustomParameters] = useState(NOISE_MODELS[3].parameters);
  const [circuitDepth, setCircuitDepth] = useState(10);
  const [numQubits, setNumQubits] = useState(4);
  const [shots, setShots] = useState(1024);

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runNoiseSimulation = async () => {
    if (isSimulating) return;

    setIsSimulating(true);

    try {
      const noiseParams = selectedNoiseModel.name === 'Custom' ? customParameters : selectedNoiseModel.parameters;

      const payload = {
        circuit: {
          numQubits: numQubits,
          gates: [
            // Generate a sample circuit based on depth
            ...Array.from({ length: circuitDepth }, (_, i) => ({
              name: i % 2 === 0 ? 'H' : 'CNOT',
              qubits: i % 2 === 0 ? [i % numQubits] : [i % numQubits, (i + 1) % numQubits]
            }))
          ]
        },
        initialState: 'ket0',
        noise: {
          enabled: true,
          type: selectedNoiseModel.name.toLowerCase().replace(' ', '_'),
          t1: noiseParams.t1,
          t2: noiseParams.t2,
          gateError1q: noiseParams.gateError,
          gateError2q: noiseParams.gateError * 10,
          readoutError0: noiseParams.readoutError,
          readoutError1: noiseParams.readoutError,
          temperature: selectedNoiseModel.name === 'Custom' ? (customParameters as any).temperature || 0.02 : 0.02,
          crosstalk: selectedNoiseModel.name === 'Custom' ? (customParameters as any).crosstalk || 0.001 : 0.001,
          enableT1T2: true,
          enableGateErrors: true,
          enableReadoutErrors: true,
          enableCrosstalk: true,
          enableThermal: true
        }
      };

      const response = await fetch('http://localhost:8082/api/quantum/noise-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // Calculate average fidelity for summary
        const avgFidelity = data.qubitResults.reduce((acc: number, q: any) => acc + q.reducedRadius, 0) / numQubits;

        const result: SimulationResult = {
          id: `sim_${Date.now()}`,
          circuit: { depth: circuitDepth, qubits: numQubits },
          noiseModel: selectedNoiseModel,
          mitigation: selectedMitigation,
          fidelity: avgFidelity,
          errorRate: 1 - avgFidelity,
          mitigatedFidelity: selectedMitigation
            ? Math.min(1.0, avgFidelity + (1 - avgFidelity) * selectedMitigation.effectiveness)
            : avgFidelity,
          executionTime: data.executionTime * 1000,
          timestamp: new Date(),
          // Extend the interface to include raw data
          rawResults: data.qubitResults
        } as any;

        setSimulationResult(result);
        setSimulationHistory(prev => [result, ...prev]);
      } else {
        console.error('Simulation failed:', data.error);
      }
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getFidelityData = () => {
    if (!simulationResult) return [];

    const data = [
      {
        name: 'Ideal',
        fidelity: 1.0,
        mitigated: 1.0
      },
      {
        name: 'Noisy',
        fidelity: simulationResult.fidelity,
        mitigated: simulationResult.mitigatedFidelity
      }
    ];

    return data;
  };

  const getErrorBreakdown = () => {
    if (!simulationResult) return [];

    const noiseParams = selectedNoiseModel.name === 'Custom' ? customParameters : selectedNoiseModel.parameters;

    return [
      {
        source: 'Gate Errors',
        error: circuitDepth * noiseParams.gateError,
        percentage: (circuitDepth * noiseParams.gateError / (1 - simulationResult.fidelity)) * 100
      },
      {
        source: 'Readout Errors',
        error: numQubits * noiseParams.readoutError,
        percentage: (numQubits * noiseParams.readoutError / (1 - simulationResult.fidelity)) * 100
      },
      {
        source: 'Coherence Loss',
        error: circuitDepth / noiseParams.t1 + circuitDepth / noiseParams.t2,
        percentage: ((circuitDepth / noiseParams.t1 + circuitDepth / noiseParams.t2) / (1 - simulationResult.fidelity)) * 100
      }
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Noise Simulator</h2>
          <p className="text-muted-foreground">Simulate and mitigate quantum noise in NISQ devices</p>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Simulation
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Noise Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Noise Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {NOISE_MODELS.map((model) => (
                    <div
                      key={model.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedNoiseModel.name === model.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => setSelectedNoiseModel(model)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{model.name}</h4>
                        <Badge variant="outline">{model.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>T₁: {model.parameters.t1}μs</div>
                        <div>T₂: {model.parameters.t2}μs</div>
                        <div>Gate Error: {(model.parameters.gateError * 100).toFixed(1)}%</div>
                        <div>Readout Error: {(model.parameters.readoutError * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Error Mitigation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Error Mitigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMitigation === null
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                      }`}
                    onClick={() => setSelectedMitigation(null)}
                  >
                    <h4 className="font-semibold">No Mitigation</h4>
                    <p className="text-sm text-muted-foreground">Run simulation without error mitigation</p>
                  </div>

                  {ERROR_MITIGATION.map((mitigation) => (
                    <div
                      key={mitigation.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMitigation?.name === mitigation.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => setSelectedMitigation(mitigation)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{mitigation.name}</h4>
                        <Badge variant="outline">{mitigation.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{mitigation.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div>Effectiveness: {(mitigation.effectiveness * 100).toFixed(0)}%</div>
                        <div>Overhead: {mitigation.overhead}x</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Parameters */}
          {selectedNoiseModel.name === 'Custom' && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Noise Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="t1">T₁ (μs)</Label>
                    <Input
                      id="t1"
                      type="number"
                      value={customParameters.t1}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, t1: parseFloat(e.target.value) || 100 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t2">T₂ (μs)</Label>
                    <Input
                      id="t2"
                      type="number"
                      value={customParameters.t2}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, t2: parseFloat(e.target.value) || 80 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gateError">Gate Error (%)</Label>
                    <Input
                      id="gateError"
                      type="number"
                      step="0.001"
                      value={customParameters.gateError * 100}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, gateError: parseFloat(e.target.value) / 100 || 0.002 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="readoutError">Readout Error (%)</Label>
                    <Input
                      id="readoutError"
                      type="number"
                      step="0.001"
                      value={customParameters.readoutError * 100}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, readoutError: parseFloat(e.target.value) / 100 || 0.015 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (K)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.001"
                      value={(customParameters as any).temperature || 0.02}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.02 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crosstalk">Crosstalk Strength</Label>
                    <Input
                      id="crosstalk"
                      type="number"
                      step="0.0001"
                      value={customParameters.crosstalk}
                      onChange={(e) => setCustomParameters(prev => ({ ...prev, crosstalk: parseFloat(e.target.value) || 0.001 }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Circuit Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Circuit Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="circuitDepth">Circuit Depth</Label>
                  <Input
                    id="circuitDepth"
                    type="number"
                    value={circuitDepth}
                    onChange={(e) => setCircuitDepth(parseInt(e.target.value) || 10)}
                    min={1}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numQubits">Number of Qubits</Label>
                  <Input
                    id="numQubits"
                    type="number"
                    value={numQubits}
                    onChange={(e) => setNumQubits(parseInt(e.target.value) || 4)}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shots">Measurement Shots</Label>
                  <Input
                    id="shots"
                    type="number"
                    value={shots}
                    onChange={(e) => setShots(parseInt(e.target.value) || 1024)}
                    min={100}
                    max={8192}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Noise Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Control Panel */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={runNoiseSimulation}
                  disabled={isSimulating}
                  className="flex-1"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Noise Simulation
                    </>
                  )}
                </Button>
              </div>

              {/* Current Simulation Status */}
              <AnimatePresence>
                {simulationResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-primary/20 rounded-lg p-4 bg-primary/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-semibold">Simulation Results</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedNoiseModel.name} • {selectedMitigation?.name || 'No Mitigation'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">
                        Completed
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Circuit Depth:</span>
                        <div className="font-medium">{circuitDepth}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Qubits:</span>
                        <div className="font-medium">{numQubits}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fidelity:</span>
                        <div className="font-medium font-mono">{simulationResult.fidelity.toFixed(4)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Error Rate:</span>
                        <div className="font-medium font-mono">{(simulationResult.errorRate * 100).toFixed(2)}%</div>
                      </div>
                    </div>

                    {selectedMitigation && (
                      <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-700">Error Mitigation Applied</span>
                        </div>
                        <div className="text-sm text-green-600">
                          Mitigated Fidelity: {simulationResult.mitigatedFidelity.toFixed(4)} •
                          Improvement: {((simulationResult.mitigatedFidelity - simulationResult.fidelity) / simulationResult.fidelity * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Simulation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {simulationResult ? (
                <div className="space-y-6">
                  {/* Fidelity Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Fidelity Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getFidelityData()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis domain={[0, 1]} />
                              <Tooltip formatter={(value: number) => [value.toFixed(4), 'Fidelity']} />
                              <Bar dataKey="fidelity" fill="#3b82f6" name="Noisy" />
                              {selectedMitigation && (
                                <Bar dataKey="mitigated" fill="#10b981" name="Mitigated" />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Error Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getErrorBreakdown().map((error, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{error.source}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full"
                                    style={{ width: `${Math.min(error.percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-mono w-12 text-right">
                                  {error.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Density Matrix Heatmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Density Matrix (Qubit 0)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-2 gap-4">
                          {(simulationResult as any).rawResults?.[0]?.densityMatrix?.map((row: string[], i: number) => (
                            row.map((val, j) => {
                              const complex = val.split(' ');
                              const real = parseFloat(complex[0]);
                              const magnitude = Math.abs(real);
                              return (
                                <div
                                  key={`${i}-${j}`}
                                  className="w-32 h-32 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 border border-white/10"
                                  style={{
                                    backgroundColor: real > 0
                                      ? `rgba(59, 130, 246, ${Math.max(0.1, magnitude)})`
                                      : `rgba(239, 68, 68, ${Math.max(0.1, magnitude)})`
                                  }}
                                >
                                  <span className="text-xs font-mono text-white/60 mb-1">
                                    |{i}⟩⟨{j}|
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {real.toFixed(4)}
                                  </span>
                                  <span className="text-[10px] text-white/40">
                                    {complex[1]} {complex[2]}
                                  </span>
                                </div>
                              );
                            })
                          ))}
                        </div>
                        <div className="mt-8 flex gap-6 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                            <span className="text-muted-foreground">Positive Real</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm" />
                            <span className="text-muted-foreground">Negative Real</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Info className="w-3 h-3" />
                            Opacity scales with magnitude
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>


                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {simulationResult.fidelity.toFixed(4)}
                          </div>
                          <div className="text-sm text-muted-foreground">Circuit Fidelity</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-500/20 bg-red-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600 mb-1">
                            {(simulationResult.errorRate * 100).toFixed(2)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Error Rate</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-500/20 bg-green-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            {simulationResult.executionTime.toFixed(0)}ms
                          </div>
                          <div className="text-sm text-muted-foreground">Execution Time</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Simulation Complete!</strong> The circuit achieved {simulationResult.fidelity.toFixed(4)} fidelity under {selectedNoiseModel.name} noise conditions.
                      {selectedMitigation && ` Error mitigation improved fidelity by ${((simulationResult.mitigatedFidelity - simulationResult.fidelity) / simulationResult.fidelity * 100).toFixed(1)}%.`}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                  <p>Run a noise simulation to see the results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {simulationHistory.map((sim) => (
                    <div key={sim.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{sim.noiseModel.name}</span>
                        <Badge variant="outline">
                          {sim.mitigation?.name || 'No Mitigation'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Fidelity: {sim.fidelity.toFixed(4)}</div>
                        <div>Error Rate: {(sim.errorRate * 100).toFixed(2)}%</div>
                        <div>Execution Time: {sim.executionTime.toFixed(0)}ms</div>
                      </div>
                    </div>
                  ))}
                  {simulationHistory.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No simulations yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Noise Theory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Types of Quantum Noise</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Coherent Errors:</strong> Systematic phase shifts and unitary errors</li>
                    <li><strong>Incoherent Errors:</strong> Random amplitude damping and dephasing</li>
                    <li><strong>Readout Errors:</strong> Measurement inaccuracies and misclassification</li>
                    <li><strong>Crosstalk:</strong> Unintended interactions between qubits</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Error Mitigation Techniques</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Readout Error Mitigation:</strong> Calibration matrix correction</li>
                    <li><strong>Zero-Noise Extrapolation:</strong> Noise scaling and extrapolation</li>
                    <li><strong>Randomized Compiling:</strong> Error averaging over decompositions</li>
                    <li><strong>Dynamical Decoupling:</strong> Coherence preservation pulses</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Key Parameters</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>T₁:</strong> Amplitude damping time constant</li>
                    <li><strong>T₂:</strong> Dephasing time constant</li>
                    <li><strong>Gate Error:</strong> Imperfect gate implementation</li>
                    <li><strong>Fidelity:</strong> Measure of quantum state preservation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Noise Profile (T₁/T₂ Decay)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={Array.from({ length: 50 }, (_, i) => {
                        const time = i * 2;
                        const t1 = selectedNoiseModel.name === 'Custom' ? customParameters.t1 : selectedNoiseModel.parameters.t1;
                        const t2 = selectedNoiseModel.name === 'Custom' ? customParameters.t2 : selectedNoiseModel.parameters.t2;
                        return {
                          time,
                          t1_decay: Math.exp(-time / t1),
                          t2_decay: Math.exp(-time / t2)
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time (μs)', position: 'insideBottom', offset: -5 }} />
                      <YAxis domain={[0, 1]} label={{ value: 'Coherence', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="t1_decay" stroke="#ef4444" name="T1 (Relaxation)" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="t2_decay" stroke="#3b82f6" name="T2 (Dephasing)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-xs text-muted-foreground flex justify-between">
                  <span>T₁: {selectedNoiseModel.name === 'Custom' ? customParameters.t1 : selectedNoiseModel.parameters.t1}μs</span>
                  <span>T₂: {selectedNoiseModel.name === 'Custom' ? customParameters.t2 : selectedNoiseModel.parameters.t2}μs</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};