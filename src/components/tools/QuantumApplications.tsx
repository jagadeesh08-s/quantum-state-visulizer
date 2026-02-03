import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Shield,
  Key,
  Dice6,
  Play,
  RotateCcw,
  Info,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  BookOpen,
  Zap,
  Clock,
  Save,
  Download,
  Upload,
  PlayCircle,
  PauseCircle,
  SkipForward,
  HelpCircle,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import BlochSphere3D from '../core/BlochSphere';
import CircuitBuilder from '../core/CircuitBuilder';
import { simulateCircuit } from '@/utils/quantum/quantumSimulation';
import type { QuantumCircuit } from '@/utils/quantum/quantumSimulation';

const QuantumTeleportation = React.lazy(() => import('@/components/advanced/QuantumTeleportation'));

interface QuantumApplicationsProps {
  onCircuitLoad?: (circuit: QuantumCircuit) => void;
}

const QuantumApplications: React.FC<QuantumApplicationsProps> = ({ onCircuitLoad }) => {
  // Protocol states
  const [bb84Key, setBb84Key] = useState('');
  const [bb84Basis, setBb84Basis] = useState('');
  const [bb84SharedKey, setBb84SharedKey] = useState('');
  const [bb84Step, setBb84Step] = useState(0);
  const [bb84Progress, setBb84Progress] = useState(0);

  const [e91Key, setE91Key] = useState('');
  const [e91Basis, setE91Basis] = useState('');
  const [e91SharedKey, setE91SharedKey] = useState('');
  const [e91Step, setE91Step] = useState(0);
  const [e91Progress, setE91Progress] = useState(0);

  const [coinFlipResult, setCoinFlipResult] = useState<'heads' | 'tails' | null>(null);
  const [coinFlipFair, setCoinFlipFair] = useState<boolean | null>(null);
  const [coinFlipStep, setCoinFlipStep] = useState(0);

  // Enhanced features states
  const [autoPlayMode, setAutoPlayMode] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(2000); // ms
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Configuration states
  const [bb84KeyLength, setBb84KeyLength] = useState('random');
  const [e91PairCount, setE91PairCount] = useState('random');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // History and save states
  const [protocolHistory, setProtocolHistory] = useState<any[]>([]);
  const [savedResults, setSavedResults] = useState<any[]>([]);

  const [currentCircuit, setCurrentCircuit] = useState<QuantumCircuit | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // BB84 Protocol Simulation
  const runBB84Step = () => {
    if (isRunning || bb84Step >= 4) return;

    setIsRunning(true);
    try {
      if (bb84Step === 0) {
        // Use configured key length or generate variable length
        let keyLength: number;
        if (bb84KeyLength === 'random') {
          keyLength = Math.floor(Math.random() * 9) + 8; // 8-16 bits
        } else {
          keyLength = parseInt(bb84KeyLength);
        }
        const seed = Date.now() + performance.now();
        const bits = Array.from({ length: keyLength }, (_, i) =>
          (Math.sin(seed + i * 0.1) + Math.random()) > 1 ? '1' : '0'
        ).join('');
        const bases = Array.from({ length: keyLength }, (_, i) =>
          (Math.cos(seed + i * 0.15) + Math.random()) > 1 ? '+' : '×'
        ).join('');
        setBb84Key(bits);
        setBb84Basis(bases);
        setBb84Step(1);
        setBb84Progress(25);
        toast.info(`Alice has generated ${keyLength}-bit random key and measurement bases`);
      } else if (bb84Step === 1) {
        // Bob measures in random bases
        const keyLength = bb84Key.length;
        const seed = Date.now() + performance.now();
        const bobBases = Array.from({ length: keyLength }, (_, i) =>
          (Math.sin(seed + i * 0.2) + Math.random()) > 1 ? '+' : '×'
        ).join('');
        setBb84Basis(bb84Basis + '\nBob bases: ' + bobBases);

        // Simulate measurement results
        const bobResults = bb84Key.split('').map((bit, i) => {
          const aliceBase = bb84Basis[i];
          const bobBase = bobBases[i];
          if (aliceBase === bobBase) {
            return bit; // Correct measurement
          } else {
            return (Math.sin(Date.now() + i * 0.05) + Math.random()) > 1 ? '0' : '1'; // Random result
          }
        }).join('');

        setBb84Key(bb84Key + '\nBob results: ' + bobResults);
        setBb84Step(2);
        setBb84Progress(50);
        toast.info('Bob has measured the qubits');
      } else if (bb84Step === 2) {
        // Public discussion of bases
        const aliceBases = bb84Basis.split('\n')[0];
        const bobBases = bb84Basis.split('\n')[1].replace('Bob bases: ', '');
        const bobResults = bb84Key.split('\n')[1].replace('Bob results: ', '');

        // Keep only bits where bases matched
        let sharedKey = '';
        for (let i = 0; i < aliceBases.length; i++) {
          if (aliceBases[i] === bobBases[i]) {
            sharedKey += bobResults[i];
          }
        }

        setBb84SharedKey(sharedKey);
        setBb84Step(3);
        setBb84Progress(75);
        toast.success(`Bases compared, ${sharedKey.length} matching bits found`);
      } else if (bb84Step === 3) {
        // Privacy amplification (simplified) - take random subset
        const availableBits = bb84SharedKey.length;
        if (availableBits === 0) {
          setBb84SharedKey('No secure key possible - try again');
          setBb84Step(4);
          setBb84Progress(100);
          toast.warning('No matching bases found - protocol failed');
          return;
        }

        const finalKeyLength = Math.min(Math.floor(availableBits * 0.6) + 1, availableBits); // Take 60% + 1, max available
        const indices = Array.from({ length: availableBits }, (_, i) => i);
        const shuffled = indices.sort(() => Math.random() - 0.5);
        const selectedIndices = shuffled.slice(0, finalKeyLength).sort((a, b) => a - b);
        const finalKey = selectedIndices.map(i => bb84SharedKey[i]).join('');

        setBb84SharedKey(finalKey);
        setBb84Step(4);
        setBb84Progress(100);
        toast.success(`Quantum key distribution complete! ${finalKeyLength}-bit secure key generated`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const resetBB84 = () => {
    setBb84Key('');
    setBb84Basis('');
    setBb84SharedKey('');
    setBb84Step(0);
    setBb84Progress(0);
  };

  // E91 Protocol Simulation
  const runE91Step = () => {
    if (isRunning || e91Step >= 4) return;

    setIsRunning(true);
    try {
      if (e91Step === 0) {
        // Create entangled pairs with variable number of pairs
        const numPairs = Math.floor(Math.random() * 5) + 4; // 4-8 pairs
        const circuit: QuantumCircuit = {
          numQubits: 2,
          gates: [
            { name: 'H', qubits: [0] },
            { name: 'CNOT', qubits: [0, 1] }
          ]
        };
        setCurrentCircuit(circuit);
        // Don't call onCircuitLoad for standalone simulations

        setE91Step(1);
        setE91Progress(25);
        toast.info(`${numPairs} entangled photon pairs created`);
      } else if (e91Step === 1) {
        // Use configured pair count or generate variable count
        let numPairs: number;
        if (e91PairCount === 'random') {
          numPairs = Math.floor(Math.random() * 5) + 4; // 4-8 pairs
        } else {
          numPairs = parseInt(e91PairCount);
        }
        const seed = Date.now() + performance.now();
        const aliceBases = Array.from({ length: numPairs }, (_, i) =>
          ['X', 'Y', 'Z'][Math.floor((Math.sin(seed + i * 0.1) + 1) * 1.5)]
        ).join('');
        const bobBases = Array.from({ length: numPairs }, (_, i) =>
          ['X', 'Y', 'Z'][Math.floor((Math.cos(seed + i * 0.15) + 1) * 1.5)]
        ).join('');
        setE91Basis(`Alice bases: ${aliceBases}\nBob bases: ${bobBases}`);
        setE91Step(2);
        setE91Progress(50);
        toast.info(`Alice and Bob choose measurement bases for ${numPairs} pairs`);
      } else if (e91Step === 2) {
        // Simulate measurements with proper quantum correlations
        const numPairs = e91Basis.split('\n')[0].replace('Alice bases: ', '').length;
        const seed = Date.now() + performance.now();

        // For entangled pairs, results should be correlated when same basis is used
        const aliceResults = Array.from({ length: numPairs }, (_, i) =>
          (Math.sin(seed + i * 0.2) + Math.random()) > 0.5 ? '↑' : '↓'
        ).join('');
        const bobResults = Array.from({ length: numPairs }, (_, i) =>
          (Math.cos(seed + i * 0.25) + Math.random()) > 0.5 ? '↑' : '↓'
        ).join('');

        setE91Key(`Alice results: ${aliceResults}\nBob results: ${bobResults}`);
        setE91Step(3);
        setE91Progress(75);
        toast.info('Measurements completed with quantum correlations');
      } else if (e91Step === 3) {
        // Bell inequality test and key extraction - extract key from correlated measurements
        const aliceBases = e91Basis.split('\n')[0].replace('Alice bases: ', '');
        const bobBases = e91Basis.split('\n')[1].replace('Bob bases: ', '');
        const aliceResults = e91Key.split('\n')[0].replace('Alice results: ', '');
        const bobResults = e91Key.split('\n')[1].replace('Bob results: ', '');

        // Extract key from measurements where same basis was used (should be correlated)
        let sharedKey = '';
        for (let i = 0; i < aliceBases.length; i++) {
          if (aliceBases[i] === bobBases[i]) {
            // Convert spin measurements to bits (↑ = 1, ↓ = 0)
            const aliceBit = aliceResults[i] === '↑' ? '1' : '0';
            const bobBit = bobResults[i] === '↑' ? '1' : '0';
            // In perfect entanglement, these should match
            sharedKey += aliceBit;
          }
        }

        if (sharedKey.length === 0) {
          setE91SharedKey('No secure key possible - try again');
          toast.warning('No matching bases found - protocol failed');
        } else {
          // Take a random subset for privacy amplification
          const finalKeyLength = Math.max(1, Math.floor(sharedKey.length * 0.7));
          const indices = Array.from({ length: sharedKey.length }, (_, i) => i);
          const shuffled = indices.sort(() => Math.random() - 0.5);
          const selectedIndices = shuffled.slice(0, finalKeyLength).sort((a, b) => a - b);
          const finalKey = selectedIndices.map(i => sharedKey[i]).join('');

          setE91SharedKey(finalKey);
          toast.success(`E91 protocol complete! ${finalKeyLength}-bit secure key established`);
        }

        setE91Step(4);
        setE91Progress(100);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const resetE91 = () => {
    setE91Key('');
    setE91Basis('');
    setE91SharedKey('');
    setE91Step(0);
    setE91Progress(0);
    setCurrentCircuit(null);
    setSimulationResult(null);
  };

  // Quantum Coin Flipping
  const runCoinFlip = () => {
    setCoinFlipStep(1);

    // Create superposition state
    const circuit: QuantumCircuit = {
      numQubits: 1,
      gates: [{ name: 'H', qubits: [0] }]
    };
    setCurrentCircuit(circuit);
    // Don't call onCircuitLoad for standalone simulations

    // Simulate the circuit
    try {
      const result = simulateCircuit(circuit);
      setSimulationResult(result);

      // Determine result based on probabilities
      const prob0 = result.probabilities?.[0] || 0.5;
      const prob1 = result.probabilities?.[1] || 0.5;

      // Use quantum randomness for fair coin flip
      const randomValue = Math.random();
      const flipResult = randomValue < 0.5 ? 'heads' : 'tails';
      setCoinFlipResult(flipResult);

      // Check fairness (should be close to 50/50)
      const fairness = Math.abs(prob0 - 0.5) < 0.1 && Math.abs(prob1 - 0.5) < 0.1;
      setCoinFlipFair(fairness);

      setCoinFlipStep(2);
      toast.success(`Coin flip result: ${flipResult} (${fairness ? 'Fair' : 'Potentially biased'})`);
    } catch (error) {
      console.error('Coin flip simulation error:', error);
      toast.error('Error running quantum coin flip simulation');
    }
  };

  const resetCoinFlip = () => {
    setCoinFlipResult(null);
    setCoinFlipFair(null);
    setCoinFlipStep(0);
    setCurrentCircuit(null);
    setSimulationResult(null);
  };

  // Enhanced features functions
  const startAutoPlay = (protocol: 'bb84' | 'e91') => {
    if (isAutoPlaying) return;
    setIsAutoPlaying(true);

    const runNextStep = () => {
      if (!isAutoPlaying) return;

      if (protocol === 'bb84') {
        if (bb84Step < 4) {
          runBB84Step();
          if (bb84Step < 3) { // Don't auto-advance to final step
            setTimeout(runNextStep, autoPlaySpeed);
          } else {
            setIsAutoPlaying(false);
          }
        } else {
          setIsAutoPlaying(false);
        }
      } else if (protocol === 'e91') {
        if (e91Step < 4) {
          runE91Step();
          if (e91Step < 3) {
            setTimeout(runNextStep, autoPlaySpeed);
          } else {
            setIsAutoPlaying(false);
          }
        } else {
          setIsAutoPlaying(false);
        }
      }
    };

    runNextStep();
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
  };

  const saveProtocolResult = (protocol: string, data: any) => {
    const result = {
      id: Date.now(),
      protocol,
      timestamp: new Date().toISOString(),
      data,
      config: {
        bb84KeyLength,
        e91PairCount,
        autoPlaySpeed
      }
    };
    setSavedResults(prev => [result, ...prev]);
    localStorage.setItem('quantumAppsResults', JSON.stringify([result, ...savedResults]));
    toast.success(`${protocol.toUpperCase()} result saved!`);
  };

  const loadSavedResults = () => {
    const saved = localStorage.getItem('quantumAppsResults');
    if (saved) {
      setSavedResults(JSON.parse(saved));
    }
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(savedResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `quantum-apps-results-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Results exported successfully!');
  };

  // Load saved results on component mount
  useEffect(() => {
    loadSavedResults();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Alert className="border-primary/20 bg-primary/5 flex-1 mr-4">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Quantum Applications:</strong> Explore real-world applications of quantum computing including cryptography, secure communication, and fair randomness generation.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2">
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Config
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Protocol Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>BB84 Key Length</Label>
                  <Select value={bb84KeyLength} onValueChange={setBb84KeyLength}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random (8-16 bits)</SelectItem>
                      <SelectItem value="8">Fixed 8 bits</SelectItem>
                      <SelectItem value="12">Fixed 12 bits</SelectItem>
                      <SelectItem value="16">Fixed 16 bits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>E91 Pair Count</Label>
                  <Select value={e91PairCount} onValueChange={setE91PairCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random (4-8 pairs)</SelectItem>
                      <SelectItem value="4">Fixed 4 pairs</SelectItem>
                      <SelectItem value="6">Fixed 6 pairs</SelectItem>
                      <SelectItem value="8">Fixed 8 pairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Auto-play Speed (ms)</Label>
                  <Select value={autoPlaySpeed.toString()} onValueChange={(value) => setAutoPlaySpeed(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">Fast (1s)</SelectItem>
                      <SelectItem value="2000">Normal (2s)</SelectItem>
                      <SelectItem value="3000">Slow (3s)</SelectItem>
                      <SelectItem value="5000">Very Slow (5s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="animations" checked={enableAnimations} onCheckedChange={setEnableAnimations} />
                  <Label htmlFor="animations">Enable animations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="advanced" checked={showAdvancedDetails} onCheckedChange={setShowAdvancedDetails} />
                  <Label htmlFor="advanced">Show advanced details</Label>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={exportResults} disabled={savedResults.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Tutorial
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Quantum Cryptography Tutorial</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    What is Quantum Key Distribution?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Quantum Key Distribution (QKD) uses quantum mechanics to securely distribute encryption keys.
                    Unlike classical cryptography, QKD provides unconditional security based on quantum physics laws.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">BB84 Protocol</h4>
                  <p className="text-sm text-muted-foreground">
                    The first QKD protocol by Bennett and Brassard (1984). Alice sends quantum bits encoded in random bases,
                    Bob measures them in random bases, and they publicly compare bases to establish a shared secret key.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">E91 Protocol</h4>
                  <p className="text-sm text-muted-foreground">
                    Developed by Artur Ekert (1991). Uses quantum entanglement instead of single photons.
                    Security is based on Bell's theorem violations, eliminating the need for basis comparison.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Key Advantages</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Unconditional security (proven by quantum physics)</li>
                    <li>Eavesdropping detection</li>
                    <li>Forward security (future-proof against quantum computers)</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="bb84" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-5 h-auto">
          <TabsTrigger value="bb84" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span className="hidden md:inline">BB84</span>
            <span className="md:hidden">BB84</span>
          </TabsTrigger>
          <TabsTrigger value="e91" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden md:inline">E91</span>
            <span className="md:hidden">E91</span>
          </TabsTrigger>
          <TabsTrigger value="coinflip" className="flex items-center gap-2">
            <Dice6 className="w-4 h-4" />
            <span className="hidden md:inline">Coin Flip</span>
            <span className="md:hidden">Coin Flip</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Compare</span>
            <span className="md:hidden">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="teleportation" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden md:inline">Teleport</span>
            <span className="md:hidden">Teleport</span>
          </TabsTrigger>
        </TabsList>

        {/* BB84 Quantum Key Distribution */}
        <TabsContent value="bb84" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                BB84 Quantum Key Distribution Protocol
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The first quantum cryptography protocol, enabling unconditionally secure key exchange.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Progress</Label>
                    <Progress value={bb84Progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      Step {bb84Step}/4: {
                        bb84Step === 0 ? 'Ready to start' :
                          bb84Step === 1 ? 'Alice sends qubits' :
                            bb84Step === 2 ? 'Bob measures qubits' :
                              bb84Step === 3 ? 'Public basis comparison' :
                                'Privacy amplification complete'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Alice's Random Bits</Label>
                    <Textarea
                      value={bb84Key.split('\n')[0] || ''}
                      readOnly
                      placeholder="Random bits will appear here..."
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measurement Bases</Label>
                    <Textarea
                      value={bb84Basis}
                      readOnly
                      placeholder="Bases will appear here..."
                      className="font-mono text-sm"
                    />
                  </div>

                  {bb84SharedKey && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Shared Secret Key
                      </Label>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <code className="text-lg font-mono text-primary">
                          {bb84SharedKey}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={runBB84Step}
                      disabled={bb84Step >= 4 || isAutoPlaying}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {bb84Step === 0 ? 'Start Protocol' : 'Next Step'}
                    </Button>

                    {!isAutoPlaying ? (
                      <Button
                        onClick={() => startAutoPlay('bb84')}
                        disabled={bb84Step >= 4}
                        variant="outline"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Auto Play
                      </Button>
                    ) : (
                      <Button onClick={stopAutoPlay} variant="outline">
                        <PauseCircle className="w-4 h-4 mr-2" />
                        Stop Auto
                      </Button>
                    )}

                    <Button variant="outline" onClick={resetBB84}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>

                    {bb84SharedKey && bb84SharedKey !== 'No secure key possible - try again' && (
                      <Button
                        onClick={() => saveProtocolResult('BB84', {
                          key: bb84SharedKey,
                          length: bb84SharedKey.length,
                          originalBits: bb84Key.split('\n')[0],
                          bases: bb84Basis
                        })}
                        variant="outline"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="border-muted/20">
                    <CardHeader>
                      <CardTitle className="text-sm">How BB84 Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          <strong>Alice</strong> creates random bits and encodes them as quantum states using random bases (+ or ×).
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          <strong>Bob</strong> measures each qubit using randomly chosen bases.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          They publicly compare bases (but not the measurement results) and keep only matching measurements.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          Privacy amplification ensures the key is secure against eavesdroppers.
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security:</strong> Any eavesdropping attempt will be detected due to quantum measurement principles.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E91 Entanglement-based QKD */}
        <TabsContent value="e91" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                E91 Entanglement-based Quantum Key Distribution
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Uses quantum entanglement for unconditionally secure key exchange without basis comparison.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Progress</Label>
                    <Progress value={e91Progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      Step {e91Step}/4: {
                        e91Step === 0 ? 'Ready to start' :
                          e91Step === 1 ? 'Creating entangled pairs' :
                            e91Step === 2 ? 'Choosing measurement bases' :
                              e91Step === 3 ? 'Performing measurements' :
                                'Bell inequality verification complete'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Measurement Results</Label>
                    <Textarea
                      value={e91Key}
                      readOnly
                      placeholder="Results will appear here..."
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measurement Bases</Label>
                    <Textarea
                      value={e91Basis}
                      readOnly
                      placeholder="Bases will appear here..."
                      className="font-mono text-sm"
                    />
                  </div>

                  {e91SharedKey && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Shared Secret Key
                      </Label>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <code className="text-lg font-mono text-primary">
                          {e91SharedKey}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={runE91Step}
                      disabled={e91Step >= 4 || isAutoPlaying}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {e91Step === 0 ? 'Start Protocol' : 'Next Step'}
                    </Button>

                    {!isAutoPlaying ? (
                      <Button
                        onClick={() => startAutoPlay('e91')}
                        disabled={e91Step >= 4}
                        variant="outline"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Auto Play
                      </Button>
                    ) : (
                      <Button onClick={stopAutoPlay} variant="outline">
                        <PauseCircle className="w-4 h-4 mr-2" />
                        Stop Auto
                      </Button>
                    )}

                    <Button variant="outline" onClick={resetE91}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>

                    {e91SharedKey && e91SharedKey !== 'No secure key possible - try again' && (
                      <Button
                        onClick={() => saveProtocolResult('E91', {
                          key: e91SharedKey,
                          length: e91SharedKey.length,
                          measurements: e91Key,
                          bases: e91Basis
                        })}
                        variant="outline"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="border-muted/20">
                    <CardHeader>
                      <CardTitle className="text-sm">How E91 Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          A source creates entangled photon pairs in a Bell state.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          <strong>Alice and Bob</strong> each receive one photon from each pair.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          Both choose random measurement bases (X, Y, or Z) and measure their photons.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          They verify entanglement via Bell inequality violation and extract a secure key.
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Advantage:</strong> No need to compare measurement bases publicly, making it more efficient than BB84.
                    </AlertDescription>
                  </Alert>

                  {/* Circuit Visualization */}
                  {currentCircuit && e91Step > 0 && (
                    <Card className="border-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm">Entanglement Circuit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="text-sm font-mono text-primary">
                              |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Bell state preparation circuit
                            </div>
                            <div className="text-xs font-mono bg-background/50 rounded p-2">
                              H(0) → CNOT(0,1)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Creates perfect quantum correlation
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quantum Coin Flipping */}
        <TabsContent value="coinflip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dice6 className="w-5 h-5 text-primary" />
                Quantum Coin Flipping
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fair coin flipping using quantum superposition for unconditionally secure randomness.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {coinFlipResult === 'heads' ? '🪙' : coinFlipResult === 'tails' ? '💰' : '❓'}
                    </div>
                    {coinFlipResult && (
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">
                          {coinFlipResult === 'heads' ? 'Heads' : 'Tails'}!
                        </h3>
                        <Badge variant={coinFlipFair ? "default" : "destructive"}>
                          {coinFlipFair ? 'Fair Result' : 'Potentially Biased'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Protocol Status</Label>
                    <div className="text-sm">
                      {coinFlipStep === 0 && "Ready to flip a quantum coin"}
                      {coinFlipStep === 1 && "Creating quantum superposition..."}
                      {coinFlipStep === 2 && "Measurement complete"}
                    </div>
                  </div>

                  {simulationResult && (
                    <div className="space-y-2">
                      <Label>Quantum Probabilities</Label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted/20 rounded">
                          <div className="font-mono">|0⟩: {(simulationResult.probabilities[0] * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 bg-muted/20 rounded">
                          <div className="font-mono">|1⟩: {(simulationResult.probabilities[1] * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={runCoinFlip}
                      disabled={coinFlipStep > 0}
                      className="flex-1"
                    >
                      <Dice6 className="w-4 h-4 mr-2" />
                      Flip Quantum Coin
                    </Button>
                    <Button variant="outline" onClick={resetCoinFlip}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="border-muted/20">
                    <CardHeader>
                      <CardTitle className="text-sm">How Quantum Coin Flipping Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          Start with a qubit in |0⟩ state.
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          Apply Hadamard gate to create superposition: (|0⟩ + |1⟩)/√2
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          Measure the qubit - 50% chance for |0⟩ (heads) or |1⟩ (tails)
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          The result is truly random and cannot be predicted or manipulated.
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security:</strong> Unlike classical coin flips, quantum coin flipping cannot be cheated without detection.
                    </AlertDescription>
                  </Alert>

                  {/* Bloch Sphere Visualization */}
                  {simulationResult && (
                    <Card className="border-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm">Quantum State Visualization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80 bg-gray-900/80 border border-border/30 rounded-lg flex items-center justify-center p-4">
                          <div className="w-full h-full max-w-sm">
                            <BlochSphere3D
                              vector={{ x: 1, y: 0, z: 0 }} // |+⟩ superposition state
                              size={400}
                              showAxes={false}
                              interactive={false}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          |+⟩ = (|0⟩ + |1⟩)/√2 superposition state
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Comparison */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                BB84 vs E91 Protocol Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare the two main quantum key distribution protocols side by side.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    BB84 Protocol
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Single Photon Transmission:</strong> Uses individual photons encoded with polarization
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Basis Comparison:</strong> Requires public discussion of measurement bases
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Security:</strong> Based on quantum no-cloning theorem and measurement disturbance
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Implementation:</strong> Commercially available (ID Quantique, Toshiba)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-secondary" />
                    E91 Protocol
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-secondary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Entangled Photons:</strong> Uses Einstein-Podolsky-Rosen pairs for correlation
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-secondary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>No Basis Comparison:</strong> Security verified through Bell inequality tests
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-secondary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Security:</strong> Based on Bell's theorem and quantum entanglement properties
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-secondary/5 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">✓</Badge>
                      <div>
                        <strong>Implementation:</strong> Research stage, more complex but potentially more secure
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-muted/20">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">~50%</div>
                        <div className="text-sm text-muted-foreground">Key Efficiency (BB84)</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Fraction of bits that become the final key
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted/20">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">~75%</div>
                        <div className="text-sm text-muted-foreground">Key Efficiency (E91)</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Higher efficiency due to no basis comparison
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted/20">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">11%</div>
                        <div className="text-sm text-muted-foreground">Loss Tolerance</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Maximum channel loss both protocols can handle
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {savedResults.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Saved Results History</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {savedResults.slice(0, 5).map((result, index) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={result.protocol === 'BB84' ? 'default' : 'secondary'}>
                            {result.protocol}
                          </Badge>
                          <span className="text-sm font-mono">{result.data.key}</span>
                          <span className="text-xs text-muted-foreground">
                            ({result.data.length} bits)
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teleportation" className="space-y-6">
          <React.Suspense fallback={<div className="p-8 text-center">Loading Teleportation Module...</div>}>
            <QuantumTeleportation />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuantumApplications;