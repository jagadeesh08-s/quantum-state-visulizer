import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Download,
  Copy,
  BarChart3,
  Calculator,
  Zap,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { type DensityMatrix } from '@/utils/quantumCodeParser';

interface QubitStateTableProps {
  results: DensityMatrix[];
}

const QubitStateTable: React.FC<QubitStateTableProps> = ({ results }) => {
  const [selectedTab, setSelectedTab] = useState('amplitudes');

  // Helper to extract real value from number or complex object
  const extractReal = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && 'real' in val) return val.real;
    return 0;
  };

  // Helper to extract magnitude from number or complex object
  const extractMagnitude = (val: any): number => {
    if (typeof val === 'number') return Math.abs(val);
    if (val && typeof val === 'object' && 'real' in val && 'imag' in val) {
      return Math.sqrt(val.real * val.real + val.imag * val.imag);
    }
    return 0;
  };

  // Calculate state amplitudes and probabilities
  const calculateStateInfo = (state: DensityMatrix, qubitIndex: number) => {
    const matrix = state.matrix;

    // For a 2x2 density matrix, the diagonal elements give us |0⟩ and |1⟩ probabilities
    const prob0 = extractReal(matrix[0][0]);
    const prob1 = extractReal(matrix[1][1]);

    // Off-diagonal elements give us coherence information
    const coherence = extractMagnitude(matrix[0][1]);

    // Amplitude magnitudes from probabilities
    const amp0 = Math.sqrt(Math.max(prob0, 0));
    const amp1 = Math.sqrt(Math.max(prob1, 0));

    // Phase from Bloch vector: φ = atan2(y, x)
    const phaseRad = Math.atan2(state.blochVector.y, state.blochVector.x);
    const phase = phaseRad * 180 / Math.PI;

    return {
      amplitudes: { '|0⟩': amp0, '|1⟩': amp1 },
      probabilities: { '|0⟩': prob0, '|1⟩': prob1 },
      coherence,
      phase: phase || 0,
      purity: state.purity,
      superposition: state.superposition || 0,
      entanglement: state.entanglement || 0
    };
  };

  // Export data
  const handleExport = (format: 'csv' | 'json') => {
    const data = results.map((state, index) => {
      const info = calculateStateInfo(state, index);
      return {
        qubit: index,
        amplitudes: info.amplitudes,
        probabilities: info.probabilities,
        coherence: info.coherence,
        phase: info.phase,
        purity: info.purity,
        superposition: info.superposition,
        entanglement: info.entanglement,
        blochVector: state.blochVector
      };
    });

    if (format === 'csv') {
      const headers = ['Qubit', '|0⟩ Amplitude', '|1⟩ Amplitude', '|0⟩ Probability', '|1⟩ Probability', 'Coherence', 'Phase', 'Purity', 'Superposition', 'Entanglement', 'X', 'Y', 'Z'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => [
          row.qubit,
          row.amplitudes['|0⟩'].toFixed(6),
          row.amplitudes['|1⟩'].toFixed(6),
          row.probabilities['|0⟩'].toFixed(6),
          row.probabilities['|1⟩'].toFixed(6),
          row.coherence.toFixed(6),
          row.phase.toFixed(2),
          row.purity.toFixed(6),
          row.superposition.toFixed(6),
          row.entanglement.toFixed(6),
          row.blochVector.x.toFixed(6),
          row.blochVector.y.toFixed(6),
          row.blochVector.z.toFixed(6)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qubit_states_${Date.now()}.csv`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qubit_states_${Date.now()}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }

    toast.success(`Qubit states exported as ${format.toUpperCase()}`);
  };

  // Copy to clipboard
  const handleCopy = () => {
    const data = results.map((state, index) => {
      const info = calculateStateInfo(state, index);
      return `Qubit ${index}: |ψ⟩ = ${info.amplitudes['|0⟩'].toFixed(3)}|0⟩ + ${info.amplitudes['|1⟩'].toFixed(3)}|1⟩`;
    }).join('\n');

    navigator.clipboard.writeText(data);
    toast.success('Qubit states copied to clipboard');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Qubit State Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="amplitudes">Amplitudes</TabsTrigger>
            <TabsTrigger value="probabilities">Probabilities</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="amplitudes">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                State Amplitudes
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qubit</TableHead>
                    <TableHead>|0⟩ Amplitude</TableHead>
                    <TableHead>|1⟩ Amplitude</TableHead>
                    <TableHead>Phase (°)</TableHead>
                    <TableHead>Coherence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((state, index) => {
                    const info = calculateStateInfo(state, index);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-mono font-semibold">
                          <Badge variant="outline">Q{index}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {info.amplitudes['|0⟩'].toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {info.amplitudes['|1⟩'].toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {info.phase.toFixed(2)}°
                        </TableCell>
                        <TableCell className="font-mono">
                          <Badge variant={info.coherence > 0.1 ? 'default' : 'secondary'}>
                            {info.coherence.toFixed(6)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="probabilities">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Measurement Probabilities
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qubit</TableHead>
                    <TableHead>P(|0⟩)</TableHead>
                    <TableHead>P(|1⟩)</TableHead>
                    <TableHead>Normalization</TableHead>
                    <TableHead>Bloch Vector</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((state, index) => {
                    const info = calculateStateInfo(state, index);
                    const normalization = info.probabilities['|0⟩'] + info.probabilities['|1⟩'];
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-mono font-semibold">
                          <Badge variant="outline">Q{index}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {info.probabilities['|0⟩'].toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {info.probabilities['|1⟩'].toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          <Badge variant={Math.abs(normalization - 1) < 0.001 ? 'default' : 'destructive'}>
                            {normalization.toFixed(6)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          ({state.blochVector.x.toFixed(3)}, {state.blochVector.y.toFixed(3)}, {state.blochVector.z.toFixed(3)})
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="properties">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quantum Properties
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qubit</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Superposition</TableHead>
                    <TableHead>Entanglement</TableHead>
                    <TableHead>State Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((state, index) => {
                    const info = calculateStateInfo(state, index);
                    const stateType = info.purity > 0.9 ? 'Pure' :
                      info.purity > 0.5 ? 'Mixed' : 'Highly Mixed';
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-mono font-semibold">
                          <Badge variant="outline">Q{index}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <Badge variant={info.purity > 0.8 ? 'default' : 'secondary'}>
                            {info.purity.toFixed(6)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <Badge variant={info.superposition > 0.1 ? 'default' : 'secondary'}>
                            {info.superposition.toFixed(6)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <Badge variant={info.entanglement > 0.1 ? 'default' : 'secondary'}>
                            {info.entanglement.toFixed(6)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            stateType === 'Pure' ? 'default' :
                              stateType === 'Mixed' ? 'secondary' : 'destructive'
                          }>
                            {stateType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Circuit Summary
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{results.length}</div>
                    <div className="text-sm text-muted-foreground">Total Qubits</div>
                  </CardContent>
                </Card>

                <Card className="border-accent/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-accent">
                      {(results.reduce((sum, s) => sum + s.purity, 0) / results.length).toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Purity</div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {Math.max(...results.map(s => s.superposition || 0)).toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Max Superposition</div>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {Math.max(...results.map(s => s.entanglement || 0)).toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Max Entanglement</div>
                  </CardContent>
                </Card>
              </div>

              {/* State representations */}
              <div className="space-y-3">
                <h5 className="font-semibold">State Representations</h5>
                {results.map((state, index) => {
                  const info = calculateStateInfo(state, index);
                  return (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <div className="font-semibold mb-2">Qubit {index}</div>
                      <div className="space-y-1 text-sm font-mono">
                        <div>
                          <span className="text-muted-foreground">|ψ⟩ = </span>
                          <span className="text-primary">{info.amplitudes['|0⟩'].toFixed(3)}</span>
                          <span className="text-muted-foreground">|0⟩ + </span>
                          <span className="text-primary">{info.amplitudes['|1⟩'].toFixed(3)}</span>
                          <span className="text-muted-foreground">|1⟩</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bloch: </span>
                          <span className="text-accent">
                            ({state.blochVector.x.toFixed(3)}, {state.blochVector.y.toFixed(3)}, {state.blochVector.z.toFixed(3)})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QubitStateTable;
