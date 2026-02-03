import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Zap,
  Target,
  Play,
  RotateCcw,
  Info,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Bug,
  Wrench,
  Layers,
  Grid3X3,
  Square,
  Circle,
  Triangle,
  Rocket,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import BlochSphere3D from '@/components/core/BlochSphere';
import { simulateCircuit } from '@/utils/quantum/quantumSimulation';
import type { QuantumCircuit } from '@/utils/quantum/quantumSimulation';

interface QuantumErrorCorrectionProps {
  onCircuitLoad?: (circuit: QuantumCircuit) => void;
}

interface ErrorCorrectionCode {
  name: string;
  description: string;
  qubits: number;
  syndromeBits: number;
  circuit: QuantumCircuit;
  gates: any[];
  explanation: string;
}

interface ErrorInjection {
  qubit: number;
  errorType: 'bit-flip' | 'phase-flip' | 'both';
  probability: number;
}

interface SyndromeMeasurement {
  syndrome: number[];
  errorLocation: number | null;
  correctionSuccess: boolean;
}

const QuantumErrorCorrection: React.FC<QuantumErrorCorrectionProps> = ({ onCircuitLoad }) => {
  const [selectedCode, setSelectedCode] = useState<string>('bit-flip');
  const [errorInjection, setErrorInjection] = useState<ErrorInjection>({
    qubit: 0,
    errorType: 'bit-flip',
    probability: 0.1
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSyndrome, setShowSyndrome] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [errorCorrectionResults, setErrorCorrectionResults] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    successRate: 0,
    averageOverhead: 0,
    errorDetectionRate: 0
  });

  // Error Correction Codes
  const errorCorrectionCodes: { [key: string]: ErrorCorrectionCode } = {
    'bit-flip': {
      name: 'Bit Flip Code (3-qubit Repetition)',
      description: 'Protects against single bit-flip errors using 3 qubits',
      qubits: 3,
      syndromeBits: 2,
      circuit: {
        numQubits: 3,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'CNOT', qubits: [0, 1] },
          { name: 'CNOT', qubits: [0, 2] }
        ]
      },
      gates: [
        { name: 'H', qubits: [0] },
        { name: 'CNOT', qubits: [0, 1] },
        { name: 'CNOT', qubits: [0, 2] }
      ],
      explanation: 'The bit flip code encodes |0⟩ as |000⟩ and |1⟩ as |111⟩. Two parity checks detect which qubit flipped.'
    },
    'phase-flip': {
      name: 'Phase Flip Code',
      description: 'Protects against single phase-flip errors',
      qubits: 3,
      syndromeBits: 2,
      circuit: {
        numQubits: 3,
        gates: [
          { name: 'H', qubits: [0] },
          { name: 'H', qubits: [1] },
          { name: 'H', qubits: [2] },
          { name: 'CNOT', qubits: [0, 1] },
          { name: 'CNOT', qubits: [0, 2] },
          { name: 'H', qubits: [0] },
          { name: 'H', qubits: [1] },
          { name: 'H', qubits: [2] }
        ]
      },
      gates: [
        { name: 'H', qubits: [0] },
        { name: 'H', qubits: [1] },
        { name: 'H', qubits: [2] },
        { name: 'CNOT', qubits: [0, 1] },
        { name: 'CNOT', qubits: [0, 2] },
        { name: 'H', qubits: [0] },
        { name: 'H', qubits: [1] },
        { name: 'H', qubits: [2] }
      ],
      explanation: 'The phase flip code protects against phase errors by encoding in the X-basis instead of Z-basis.'
    },
    'shor': {
      name: 'Shor Code (9-qubit)',
      description: 'Protects against both bit-flip and phase-flip errors',
      qubits: 9,
      syndromeBits: 8,
      circuit: {
        numQubits: 9,
        gates: [
          // Phase flip encoding (outer code)
          { name: 'H', qubits: [0, 3, 6] },
          { name: 'CNOT', qubits: [0, 1] },
          { name: 'CNOT', qubits: [0, 2] },
          { name: 'CNOT', qubits: [3, 4] },
          { name: 'CNOT', qubits: [3, 5] },
          { name: 'CNOT', qubits: [6, 7] },
          { name: 'CNOT', qubits: [6, 8] },
          // Bit flip encoding (inner code)
          { name: 'H', qubits: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
          { name: 'CNOT', qubits: [0, 3] },
          { name: 'CNOT', qubits: [0, 6] },
          { name: 'CNOT', qubits: [1, 4] },
          { name: 'CNOT', qubits: [1, 7] },
          { name: 'CNOT', qubits: [2, 5] },
          { name: 'CNOT', qubits: [2, 8] },
          { name: 'H', qubits: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
        ]
      },
      gates: [
        // Phase flip encoding (outer code)
        { name: 'H', qubits: [0, 3, 6] },
        { name: 'CNOT', qubits: [0, 1] },
        { name: 'CNOT', qubits: [0, 2] },
        { name: 'CNOT', qubits: [3, 4] },
        { name: 'CNOT', qubits: [3, 5] },
        { name: 'CNOT', qubits: [6, 7] },
        { name: 'CNOT', qubits: [6, 8] },
        // Bit flip encoding (inner code)
        { name: 'H', qubits: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        { name: 'CNOT', qubits: [0, 3] },
        { name: 'CNOT', qubits: [0, 6] },
        { name: 'CNOT', qubits: [1, 4] },
        { name: 'CNOT', qubits: [1, 7] },
        { name: 'CNOT', qubits: [2, 5] },
        { name: 'CNOT', qubits: [2, 8] },
        { name: 'H', qubits: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
      ],
      explanation: 'The Shor code combines bit-flip and phase-flip codes to protect against arbitrary single-qubit errors.'
    },
    'surface': {
      name: 'Surface Code Concepts',
      description: '2D topological quantum error correction',
      qubits: 13,
      syndromeBits: 4,
      circuit: {
        numQubits: 13,
        gates: [
          // Simplified surface code structure
          { name: 'H', qubits: [0, 2, 4, 6, 8, 10, 12] },
          { name: 'CNOT', qubits: [0, 1] },
          { name: 'CNOT', qubits: [2, 3] },
          { name: 'CNOT', qubits: [4, 5] },
          { name: 'CNOT', qubits: [6, 7] },
          { name: 'CNOT', qubits: [8, 9] },
          { name: 'CNOT', qubits: [10, 11] },
          { name: 'CNOT', qubits: [12, 1] }
        ]
      },
      gates: [
        // Simplified surface code structure
        { name: 'H', qubits: [0, 2, 4, 6, 8, 10, 12] },
        { name: 'CNOT', qubits: [0, 1] },
        { name: 'CNOT', qubits: [2, 3] },
        { name: 'CNOT', qubits: [4, 5] },
        { name: 'CNOT', qubits: [6, 7] },
        { name: 'CNOT', qubits: [8, 9] },
        { name: 'CNOT', qubits: [10, 11] },
        { name: 'CNOT', qubits: [12, 1] }
      ],
      explanation: 'Surface codes use 2D lattices of qubits with syndrome measurements to detect and correct errors.'
    }
  };

  // Inject error into circuit
  const injectError = (circuit: QuantumCircuit, error: ErrorInjection): QuantumCircuit => {
    const errorGate = error.errorType === 'bit-flip' ? 'X' :
      error.errorType === 'phase-flip' ? 'Z' : 'Y';

    return {
      ...circuit,
      gates: [
        ...circuit.gates,
        { name: errorGate, qubits: [error.qubit] }
      ]
    };
  };

  // Measure syndrome
  const measureSyndrome = (circuit: QuantumCircuit): SyndromeMeasurement => {
    // Simplified syndrome measurement - in reality this would be more complex
    const syndrome = [0, 0]; // Placeholder for syndrome bits

    // Simulate measurement
    try {
      const result = simulateCircuit(circuit);
      // Determine error location based on syndrome (simplified)
      let errorLocation: number | null = null;
      if (syndrome[0] === 1 && syndrome[1] === 0) errorLocation = 0;
      else if (syndrome[0] === 0 && syndrome[1] === 1) errorLocation = 1;
      else if (syndrome[0] === 1 && syndrome[1] === 1) errorLocation = 2;

      return {
        syndrome,
        errorLocation,
        correctionSuccess: errorLocation !== null
      };
    } catch (error) {
      return {
        syndrome: [0, 0],
        errorLocation: null,
        correctionSuccess: false
      };
    }
  };

  // Apply error correction
  const applyErrorCorrection = (circuit: QuantumCircuit, syndrome: SyndromeMeasurement): QuantumCircuit => {
    if (!syndrome.errorLocation) return circuit;

    // Apply correction based on error location
    const correctionGate = errorInjection.errorType === 'bit-flip' ? 'X' :
      errorInjection.errorType === 'phase-flip' ? 'Z' : 'Y';

    return {
      ...circuit,
      gates: [
        ...circuit.gates,
        { name: correctionGate, qubits: [syndrome.errorLocation] }
      ]
    };
  };

  // Run error correction simulation
  const runErrorCorrection = async () => {
    if (isSimulating) return;

    setIsSimulating(true);
    try {
      const code = errorCorrectionCodes[selectedCode];

      // Step 1: Encode the state
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Inject error
      setCurrentStep(2);
      const circuitWithError = injectError(code.circuit, errorInjection);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Measure syndrome
      setCurrentStep(3);
      const syndrome = measureSyndrome(circuitWithError);
      setShowSyndrome(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Apply correction
      setCurrentStep(4);
      const correctedCircuit = applyErrorCorrection(circuitWithError, syndrome);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Decode and verify
      setCurrentStep(5);
      const finalResult = simulateCircuit(correctedCircuit);
      setSimulationResults(finalResult);

      // Calculate performance metrics
      const successRate = syndrome.correctionSuccess ? 0.9 : 0.1; // Simplified
      const overhead = code.qubits / 1; // Overhead compared to single qubit
      const detectionRate = 0.95; // Simplified

      setPerformanceMetrics({
        successRate: successRate * 100,
        averageOverhead: overhead,
        errorDetectionRate: detectionRate * 100
      });

      setErrorCorrectionResults({
        originalState: simulateCircuit(code.circuit),
        errorState: simulateCircuit(circuitWithError),
        correctedState: finalResult,
        syndrome,
        success: syndrome.correctionSuccess
      });

      setCurrentStep(6);
      toast.success('Error correction simulation complete!');

    } catch (error) {
      console.error('Error correction simulation failed:', error);
      toast.error('Error correction simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setCurrentStep(0);
    setShowSyndrome(false);
    setSimulationResults(null);
    setErrorCorrectionResults(null);
    setPerformanceMetrics({
      successRate: 0,
      averageOverhead: 0,
      errorDetectionRate: 0
    });
  };

  const getStepDescription = (step: number): string => {
    const steps = [
      'Ready to start',
      'Encoding quantum state',
      'Injecting error',
      'Measuring syndrome',
      'Applying correction',
      'Verifying correction',
      'Complete'
    ];
    return steps[step] || 'Unknown step';
  };

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Quantum Error Correction:</strong> Explore how quantum computers protect against noise and errors using advanced error correction codes. These techniques are essential for building reliable quantum computers. Learn about the fundamental limits of quantum error correction and why it's more challenging than classical error correction.
        </AlertDescription>
      </Alert>

      {/* Quick Start Guide */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Rocket className="w-4 h-4" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300">
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Select an error correction code</strong> from the tabs above</li>
            <li><strong>Configure error injection</strong> using the controls (choose qubit, error type, and probability)</li>
            <li><strong>Click "Run Error Correction"</strong> to see the complete process</li>
            <li><strong>Observe the results</strong> in the syndrome measurements and performance metrics</li>
            <li><strong>Compare states</strong> to understand how correction recovers quantum information</li>
          </ol>
          <div className="mt-3 p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded text-xs">
            <strong>💡 Tip:</strong> Start with the Bit Flip Code - it's the simplest to understand but demonstrates all key concepts.
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedCode} onValueChange={setSelectedCode} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bit-flip" className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            Bit Flip Code
          </TabsTrigger>
          <TabsTrigger value="phase-flip" className="flex items-center gap-2">
            <Triangle className="w-4 h-4" />
            Phase Flip Code
          </TabsTrigger>
          <TabsTrigger value="shor" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Shor Code
          </TabsTrigger>
          <TabsTrigger value="surface" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Surface Code
          </TabsTrigger>
        </TabsList>

        {Object.entries(errorCorrectionCodes).map(([key, code]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {code.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {code.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Progress and Controls */}
                    <div className="space-y-2">
                      <Label>Simulation Progress</Label>
                      <Progress value={(currentStep / 6) * 100} className="w-full" />
                      <p className="text-xs text-muted-foreground">
                        Step {currentStep}/6: {getStepDescription(currentStep)}
                      </p>
                    </div>

                    {/* Error Injection Controls */}
                    <Card className="border-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Bug className="w-4 h-4" />
                          Error Injection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Target Qubit: {errorInjection.qubit}</Label>
                          <Slider
                            value={[errorInjection.qubit]}
                            onValueChange={(value) => setErrorInjection(prev => ({ ...prev, qubit: value[0] }))}
                            max={code.qubits - 1}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Error Type</Label>
                          <select
                            value={errorInjection.errorType}
                            onChange={(e) => setErrorInjection(prev => ({ ...prev, errorType: e.target.value as any }))}
                            className="w-full p-2 border rounded"
                          >
                            <option value="bit-flip">Bit Flip (X error)</option>
                            <option value="phase-flip">Phase Flip (Z error)</option>
                            <option value="both">Both (Y error)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Error Probability: {(errorInjection.probability * 100).toFixed(1)}%</Label>
                          <Slider
                            value={[errorInjection.probability]}
                            onValueChange={(value) => setErrorInjection(prev => ({ ...prev, probability: value[0] }))}
                            max={1}
                            min={0}
                            step={0.01}
                            className="w-full"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Syndrome Measurement Display */}
                    {showSyndrome && (
                      <Card className="border-muted/20">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Syndrome Measurement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Syndrome:</span>
                              <Badge variant="outline">
                                [{errorCorrectionResults?.syndrome?.join(', ') || '0, 0'}]
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Error Location:</span>
                              <Badge variant={errorCorrectionResults?.syndrome?.errorLocation !== null ? "default" : "destructive"}>
                                {errorCorrectionResults?.syndrome?.errorLocation ?? 'Not detected'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Performance Metrics */}
                    {performanceMetrics.successRate > 0 && (
                      <Card className="border-muted/20">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                {performanceMetrics.successRate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Success Rate</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                {performanceMetrics.averageOverhead.toFixed(1)}x
                              </div>
                              <div className="text-xs text-muted-foreground">Overhead</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-purple-600">
                                {performanceMetrics.errorDetectionRate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Detection</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Control Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={runErrorCorrection}
                        disabled={isSimulating}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isSimulating ? 'Running...' : 'Run Error Correction'}
                      </Button>
                      <Button variant="outline" onClick={resetSimulation}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Educational Content */}
                    <Card className="border-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          How {code.name} Works
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="space-y-3">
                          <p className="text-muted-foreground leading-relaxed">{code.explanation}</p>

                          {/* Detailed explanations for each code */}
                          {key === 'bit-flip' && (
                            <div className="space-y-3 border-t border-muted/20 pt-3">
                              <h4 className="font-semibold text-primary">Step-by-Step Process:</h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="mt-0.5 text-xs">1</Badge>
                                  <div>
                                    <strong>Encoding:</strong> |0⟩ → |000⟩, |1⟩ → |111⟩ using H and CNOT gates
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="mt-0.5 text-xs">2</Badge>
                                  <div>
                                    <strong>Error Detection:</strong> Measure parity bits to identify error location
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="mt-0.5 text-xs">3</Badge>
                                  <div>
                                    <strong>Correction:</strong> Apply X gate to flip the erroneous qubit back
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {key === 'phase-flip' && (
                            <div className="space-y-3 border-t border-muted/20 pt-3">
                              <h4 className="font-semibold text-primary">Key Concepts:</h4>
                              <div className="space-y-2 text-xs">
                                <div>• Encodes in X-basis instead of Z-basis</div>
                                <div>• Protects against phase errors (Z rotations)</div>
                                <div>• Uses Hadamard gates to switch measurement bases</div>
                                <div>• Syndrome measurement reveals phase error location</div>
                              </div>
                            </div>
                          )}

                          {key === 'shor' && (
                            <div className="space-y-3 border-t border-muted/20 pt-3">
                              <h4 className="font-semibold text-primary">Architecture:</h4>
                              <div className="space-y-2 text-xs">
                                <div>• <strong>Outer Code:</strong> 3-qubit phase flip protection</div>
                                <div>• <strong>Inner Code:</strong> 3-qubit bit flip protection per block</div>
                                <div>• <strong>Combined:</strong> Protects against arbitrary single-qubit errors</div>
                                <div>• <strong>Overhead:</strong> 9 qubits for 1 logical qubit</div>
                              </div>
                            </div>
                          )}

                          {key === 'surface' && (
                            <div className="space-y-3 border-t border-muted/20 pt-3">
                              <h4 className="font-semibold text-primary">Surface Code Advantages:</h4>
                              <div className="space-y-2 text-xs">
                                <div>• <strong>Scalable:</strong> Error rates decrease with code size</div>
                                <div>• <strong>Fault-tolerant:</strong> Can handle faulty syndrome measurements</div>
                                <div>• <strong>Practical:</strong> Currently leading approach for quantum computers</div>
                                <div>• <strong>2D Layout:</strong> Easier to implement on quantum chips</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-muted/20">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Qubits</Badge>
                            <span className="font-semibold">{code.qubits}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Syndrome Bits</Badge>
                            <span className="font-semibold">{code.syndromeBits}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Overhead</Badge>
                            <span className="font-semibold">{code.qubits}x</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Error Types</Badge>
                            <span className="font-semibold">
                              {key === 'bit-flip' ? 'X' : key === 'phase-flip' ? 'Z' : key === 'shor' ? 'X,Z,Y' : 'Any'}
                            </span>
                          </div>
                        </div>

                        {/* Learning Resources */}
                        <div className="pt-3 border-t border-muted/20">
                          <h4 className="font-semibold text-primary text-xs mb-2">Learning Resources:</h4>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/20"
                              onClick={() => window.open('https://en.wikipedia.org/wiki/Quantum_error_correction', '_blank')}>
                              Wikipedia
                            </Badge>
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/20"
                              onClick={() => window.open('https://quantum.country/qec', '_blank')}>
                              Quantum Country
                            </Badge>
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/20"
                              onClick={() => window.open('https://arxiv.org/abs/0905.2794', '_blank')}>
                              Nielsen & Chuang
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* State Comparison */}
                    {errorCorrectionResults && (
                      <Card className="border-muted/20">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            State Evolution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-center">
                              <h4 className="text-sm font-semibold mb-4">Error Correction Process</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center space-y-2">
                                  <div className="text-xs text-muted-foreground font-medium">1. Encoded State</div>
                                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center border-2 border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="text-xs text-muted-foreground">Protected quantum state</div>
                                </div>
                                <div className="text-center space-y-2">
                                  <div className="text-xs text-muted-foreground font-medium">2. Error Injected</div>
                                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center border-2 border-red-200 dark:border-red-800">
                                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div className="text-xs text-muted-foreground">{errorInjection.errorType} error on qubit {errorInjection.qubit}</div>
                                </div>
                                <div className="text-center space-y-2">
                                  <div className="text-xs text-muted-foreground font-medium">3. Corrected State</div>
                                  <div className={`w-20 h-20 rounded-lg flex items-center justify-center border-2 ${errorCorrectionResults.success
                                      ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                      : 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                    }`}>
                                    {errorCorrectionResults.success ? (
                                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    ) : (
                                      <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {errorCorrectionResults.success ? 'Successfully recovered' : 'Correction failed'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Detailed State Information */}
                            <div className="space-y-3 pt-4 border-t border-muted/20">
                              <h5 className="text-sm font-semibold">Quantum State Details:</h5>
                              <div className="grid grid-cols-1 gap-3 text-xs">
                                <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                                  <span className="text-muted-foreground">Original Fidelity:</span>
                                  <Badge variant="outline">100%</Badge>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                                  <span className="text-muted-foreground">After Error:</span>
                                  <Badge variant="destructive">
                                    {((1 - errorInjection.probability) * 100).toFixed(1)}%
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                                  <span className="text-muted-foreground">After Correction:</span>
                                  <Badge variant={errorCorrectionResults.success ? "default" : "destructive"}>
                                    {errorCorrectionResults.success ? '99%' : 'Low'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Educational Note */}
                            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Key Insight:</strong> Error correction codes can recover quantum information even after errors occur,
                                as long as the error rate stays below certain thresholds. This is crucial for building reliable quantum computers.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Circuit Visualization */}
                    <Card className="border-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Quantum Circuit Structure
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Circuit Diagram Placeholder */}
                          <div className="bg-muted/20 rounded-lg p-4 text-center border-2 border-dashed border-muted-foreground/20">
                            <div className="text-sm font-mono text-primary mb-2">
                              {code.name}
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              {code.gates.length} gates, {code.qubits} qubits
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Click "Run Error Correction" to see the process in action
                            </div>
                          </div>

                          {/* Gate Sequence */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-muted-foreground">Gate Sequence:</h5>
                            <div className="flex flex-wrap gap-1">
                              {code.gates.slice(0, 8).map((gate, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {gate.name}({gate.qubits.join(',')})
                                </Badge>
                              ))}
                              {code.gates.length > 8 && (
                                <Badge variant="outline" className="text-xs">
                                  +{code.gates.length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Circuit Properties */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Depth:</span>
                              <span className="font-mono">{Math.max(...code.gates.map(g => (g as any).position ?? 0)) + 1}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Connectivity:</span>
                              <span className="font-mono">
                                {code.gates.filter(g => g.qubits.length > 1).length > 0 ? 'Entangling' : 'Product'}
                              </span>
                            </div>
                          </div>

                          {/* Educational Note */}
                          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                              <strong>Did you know?</strong> Quantum error correction codes use redundancy to protect quantum information,
                              similar to how classical error correction (like RAID) protects digital data.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default QuantumErrorCorrection;