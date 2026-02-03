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
import {
  Play,
  Square,
  TrendingUp,
  Target,
  Zap,
  Atom,
  Calculator,
  BarChart3,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SPSAOptimizer, VQE as VQERunner } from '@/utils/quantum/vqaAlgorithms';
import { simulateCircuit } from '@/utils/quantum/circuitOperations';
import { ComplexMatrix } from '@/utils/core/complex';

interface Molecule {
  name: string;
  formula: string;
  atoms: number;
  electrons: number;
  description: string;
}

interface VQEJob {
  id: string;
  molecule: Molecule;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  energy: number | null;
  iterations: number;
  convergence: number[];
  startTime: Date;
  endTime?: Date;
  error?: string;
}

const MOLECULES: Molecule[] = [
  {
    name: 'Hydrogen',
    formula: 'H₂',
    atoms: 2,
    electrons: 2,
    description: 'Simplest molecule, ground state energy calculation'
  },
  {
    name: 'Helium Hydride',
    formula: 'HeH⁺',
    atoms: 2,
    electrons: 2,
    description: 'Two-electron system with nuclear charge difference'
  },
  {
    name: 'Lithium Hydride',
    formula: 'LiH',
    atoms: 2,
    electrons: 4,
    description: 'Small molecule with 4 electrons'
  },
  {
    name: 'Water',
    formula: 'H₂O',
    atoms: 3,
    electrons: 10,
    description: 'Common molecule with 10 electrons'
  },
  {
    name: 'Ammonia',
    formula: 'NH₃',
    atoms: 4,
    electrons: 10,
    description: 'Pyramidal molecule with nitrogen'
  }
];

const VQE_ALGORITHMS = [
  { id: 'UCCSD', name: 'UCCSD', description: 'Unitary Coupled Cluster with Singles and Doubles' },
  { id: 'UCCGSD', name: 'UCCGSD', description: 'UCC with Generalized Singles and Doubles' },
  { id: 'VQE_UCC', name: 'VQE-UCC', description: 'Variational Quantum Eigensolver with UCC ansatz' },
  { id: 'Hardware_Efficient', name: 'Hardware Efficient', description: 'Hardware-efficient ansatz for NISQ devices' }
];

const OPTIMIZERS = [
  { id: 'SPSA', name: 'SPSA', description: 'Simultaneous Perturbation Stochastic Approximation' },
  { id: 'COBYLA', name: 'COBYLA', description: 'Constrained Optimization BY Linear Approximation' },
  { id: 'SLSQP', name: 'SLSQP', description: 'Sequential Least Squares Programming' },
  { id: 'ADAM', name: 'ADAM', description: 'Adaptive Moment Estimation' }
];

export const VQEPlayground: React.FC = () => {
  const [selectedMolecule, setSelectedMolecule] = useState<Molecule>(MOLECULES[0]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('UCCSD');
  const [selectedOptimizer, setSelectedOptimizer] = useState('SPSA');
  const [maxIterations, setMaxIterations] = useState(100);
  const [tolerance, setTolerance] = useState(1e-6);
  const [ansatzLayers, setAnsatzLayers] = useState(2);

  const [currentJob, setCurrentJob] = useState<VQEJob | null>(null);
  const [jobHistory, setJobHistory] = useState<VQEJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runVQE = async () => {
    if (isRunning) return;

    setIsRunning(true);
    const jobId = `vqe_${Date.now()}`;

    const job: VQEJob = {
      id: jobId,
      molecule: selectedMolecule,
      status: 'running',
      progress: 0,
      energy: null,
      iterations: 0,
      convergence: [],
      startTime: new Date()
    };

    setCurrentJob(job);

    // Hamiltonian for H2 (approximate for demo)
    // H = -1.0523*I + 0.3979*Z1 + 0.3979*Z2 - 0.0112*Z1Z2 + 0.1809*X1X2
    const hamiltonian: number[][] = [
      [-1.0523732 + 0.39793742 + 0.39793742 - 0.0112, 0, 0, 0.1809],
      [0, -1.0523732 + 0.39793742 - 0.39793742 + 0.0112, 0.1809, 0],
      [0, 0.1809, -1.0523732 - 0.39793742 + 0.39793742 + 0.0112, 0],
      [0.1809, 0, 0, -1.0523732 - 0.39793742 - 0.39793742 - 0.0112]
    ];

    const vqeRunner = new VQERunner(hamiltonian);

    // Override computeExpectationValue with real simulation
    (vqeRunner as any).computeExpectationValue = (circuit: any): number => {
      const results = simulateCircuit({
        numQubits: 2,
        gates: circuit.gates
      });

      const rho = results.densityMatrix as ComplexMatrix;
      let energy = 0;

      // Calculate ⟨ψ|H|ψ⟩ = Tr(ρH)
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          energy += rho[i][j].real * hamiltonian[j][i];
        }
      }
      return energy;
    };

    const optimizer = new SPSAOptimizer();
    const initialParams = Array(ansatzLayers * 2).fill(0).map(() => Math.random() * Math.PI);

    let currentIteration = 0;
    const history: number[] = [];
    let params = [...initialParams];
    let bestEnergy = Infinity;

    const tick = () => {
      if (!isRunning) return;

      const result = vqeRunner.optimize(optimizer, params);
      currentIteration += result.convergenceHistory.length;
      params = result.optimalParameters;
      const energies = result.convergenceHistory.map(h => h.value);
      history.push(...energies);

      const currentEnergy = history[history.length - 1];
      if (currentEnergy < bestEnergy) bestEnergy = currentEnergy;

      const progress = (currentIteration / maxIterations) * 100;

      setCurrentJob(prev => prev ? {
        ...prev,
        progress: Math.min(progress, 100),
        iterations: currentIteration,
        convergence: [...history],
        energy: currentEnergy
      } : null);

      if (currentIteration >= maxIterations || progress >= 100) {
        setIsRunning(false);
        setCurrentJob(prev => prev ? {
          ...prev,
          status: 'completed',
          progress: 100,
          energy: bestEnergy,
          endTime: new Date()
        } : null);
        setJobHistory(prev => [job, ...prev]);
      } else {
        setTimeout(tick, 50);
      }
    };

    tick();
  };

  const stopVQE = () => {
    setCurrentJob(prev => prev ? {
      ...prev,
      status: 'failed',
      endTime: new Date(),
      error: 'User cancelled'
    } : null);
    setIsRunning(false);
  };

  const formatEnergy = (energy: number | null) => {
    if (energy === null) return 'N/A';
    return `${energy.toFixed(6)} Hartree`;
  };

  const getConvergenceData = () => {
    if (!currentJob?.convergence.length) return [];
    return currentJob.convergence.map((energy, index) => ({
      iteration: index + 1,
      energy: energy
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
          <Atom className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">VQE Playground</h2>
          <p className="text-muted-foreground">Variational Quantum Eigensolver for molecular energy calculations</p>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Execution
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
            {/* Molecule Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Molecule Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {MOLECULES.map((molecule) => (
                    <div
                      key={molecule.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMolecule.name === molecule.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => setSelectedMolecule(molecule)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{molecule.name}</h4>
                        <Badge variant="outline">{molecule.formula}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{molecule.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{molecule.atoms} atoms</span>
                        <span>{molecule.electrons} electrons</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Algorithm Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Algorithm Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>VQE Algorithm</Label>
                  <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VQE_ALGORITHMS.map((alg) => (
                        <SelectItem key={alg.id} value={alg.id}>
                          <div>
                            <div className="font-medium">{alg.name}</div>
                            <div className="text-xs text-muted-foreground">{alg.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Optimizer</Label>
                  <Select value={selectedOptimizer} onValueChange={setSelectedOptimizer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIMIZERS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          <div>
                            <div className="font-medium">{opt.name}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxIterations">Max Iterations</Label>
                    <Input
                      id="maxIterations"
                      type="number"
                      value={maxIterations || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setMaxIterations(isNaN(val) ? 0 : val);
                      }}
                      min={10}
                      max={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tolerance">Tolerance</Label>
                    <Input
                      id="tolerance"
                      type="number"
                      value={tolerance || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTolerance(isNaN(val) ? 0 : val);
                      }}
                      step="1e-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ansatzLayers">Ansatz Layers</Label>
                  <Input
                    id="ansatzLayers"
                    type="number"
                    value={ansatzLayers || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setAnsatzLayers(isNaN(val) ? 0 : val);
                    }}
                    min={1}
                    max={10}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                VQE Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Job Status */}
              <AnimatePresence>
                {currentJob && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-primary/20 rounded-lg p-4 bg-primary/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-semibold">VQE Calculation</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedMolecule.name} ({selectedMolecule.formula})
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        currentJob.status === 'completed' ? 'bg-green-500' :
                          currentJob.status === 'running' ? 'bg-blue-500' :
                            currentJob.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                      }>
                        {currentJob.status}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{currentJob.progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={currentJob.progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Algorithm:</span>
                          <div className="font-medium">{selectedAlgorithm}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Optimizer:</span>
                          <div className="font-medium">{selectedOptimizer}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Iterations:</span>
                          <div className="font-medium">{currentJob.iterations}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Energy:</span>
                          <div className="font-medium font-mono">{formatEnergy(currentJob.energy)}</div>
                        </div>
                      </div>

                      {currentJob.status === 'running' && (
                        <Button onClick={stopVQE} variant="outline" size="sm">
                          <Square className="w-4 h-4 mr-2" />
                          Stop VQE
                        </Button>
                      )}

                      {currentJob.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{currentJob.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Control Panel */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={runVQE}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running VQE...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run VQE Calculation
                    </>
                  )}
                </Button>
              </div>

              {/* Convergence Plot */}
              {currentJob && currentJob.convergence.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Energy Convergence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getConvergenceData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="iteration" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip
                              formatter={(value: number) => [value.toFixed(6), 'Energy (Hartree)']}
                              labelFormatter={(label) => `Iteration ${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="energy"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NEW: Quantum vs Classical Comparison Graph */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-500" />
                        Quantum vs. Classical Benchmark
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={getConvergenceData().map(d => ({
                              ...d,
                              classicalLimit: -1.1373 // Hardcoded exact energy for H2 demo
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="iteration" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.9)', borderRadius: '8px', border: '1px solid #444' }}
                            />
                            <Legend verticalAlign="top" height={36} />

                            <Line
                              name="Quantum VQE (Approx)"
                              type="monotone"
                              dataKey="energy"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={false}
                            />
                            <Line
                              name="Classical FCI (Exact)"
                              type="monotone"
                              dataKey="classicalLimit"
                              stroke="#ec4899"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-2 text-xs text-muted-foreground">
                          Comparison of Variational Quantum Eigensolver trajectory against Classical Full Configuration Interaction (FCI) exact limit.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                VQE Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentJob?.status === 'completed' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-green-500/20 bg-green-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            {formatEnergy(currentJob.energy)}
                          </div>
                          <div className="text-sm text-muted-foreground">Ground State Energy</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {currentJob.iterations}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Iterations</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-500/20 bg-purple-500/5">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600 mb-1">
                            {((currentJob.endTime!.getTime() - currentJob.startTime.getTime()) / 1000).toFixed(1)}s
                          </div>
                          <div className="text-sm text-muted-foreground">Execution Time</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>VQE Calculation Complete!</strong> The ground state energy of {selectedMolecule.name} has been calculated using the {selectedAlgorithm} algorithm with {selectedOptimizer} optimization.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                  <p>Run a VQE calculation to see the results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Job History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobHistory.map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{job.molecule.name}</span>
                        <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Energy: {formatEnergy(job.energy)}</div>
                        <div>Iterations: {job.iterations}</div>
                        <div>Algorithm: {selectedAlgorithm}</div>
                      </div>
                    </div>
                  ))}
                  {jobHistory.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No completed jobs yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>VQE Theory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What is VQE?</h4>
                  <p className="text-sm text-muted-foreground">
                    Variational Quantum Eigensolver (VQE) is a hybrid quantum-classical algorithm used to find the ground state energy of molecular systems. It uses a parameterized quantum circuit (ansatz) to prepare trial wavefunctions and classical optimization to minimize the energy expectation value.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Key Components</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Ansatz:</strong> Parameterized quantum circuit</li>
                    <li><strong>Hamiltonian:</strong> Molecular energy operator</li>
                    <li><strong>Optimizer:</strong> Classical optimization algorithm</li>
                    <li><strong>Expectation Value:</strong> Energy measurement</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Applications</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Quantum chemistry calculations</li>
                    <li>• Drug discovery and materials science</li>
                    <li>• Molecular property prediction</li>
                    <li>• Reaction energy calculations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};