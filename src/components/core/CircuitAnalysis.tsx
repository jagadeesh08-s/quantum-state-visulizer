import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BlochSphere3D from './BlochSphere';
import { simulateCircuit } from '@/utils/quantum/quantumSimulation';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, CheckCircle2, Circle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { QuantumGate } from '@/utils/quantum/circuitOperations';
import { TimelineEvent } from '@/contexts/IBMQuantumContext';

interface CircuitAnalysisProps {
    numQubits: number;
    circuitGates: Array<{
        name: string;
        qubits: number[];
        parameters?: { [key: string]: number };
    }>;
    ketStates: string[];
    ibmResults?: Record<string, number>;
    ibmStatus?: string;
    ibmTimeline?: TimelineEvent[];
}

interface QubitAnalysis {
    index: number;
    blochVector: { x: number; y: number; z: number };
    purity: number;
    entropy: number;
    state: 'Pure' | 'Mixed';
}

const CircuitAnalysis: React.FC<CircuitAnalysisProps> = ({ numQubits, circuitGates, ketStates, ibmResults, ibmStatus, ibmTimeline }) => {
    const [analyzedQubits, setAnalyzedQubits] = useState<QubitAnalysis[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        let active = true;
        const calculate = async () => {
            setIsCalculating(true);

            try {
                const circuit = {
                    numQubits,
                    gates: circuitGates.map(g => ({
                        name: g.name,
                        qubits: g.qubits,
                        parameters: g.parameters
                    } as QuantumGate))
                };

                const result = simulateCircuit(circuit);

                if (!active) return;

                if (result.reducedStates) {
                    const analyses: QubitAnalysis[] = result.reducedStates.map((reduced, i) => ({
                        index: i,
                        blochVector: reduced.blochVector,
                        purity: reduced.purity,
                        entropy: reduced.vonNeumannEntropy || 0,
                        state: reduced.purity >= 0.99 ? 'Pure' : 'Mixed'
                    }));
                    setAnalyzedQubits(analyses);
                }

            } catch (err) {
                console.error("Simulation error in analysis:", err);
                if (active) setAnalyzedQubits([]);
            } finally {
                if (active) setIsCalculating(false);
            }
        };

        const timer = setTimeout(calculate, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [numQubits, circuitGates, ketStates]);

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Multi-Qubit State Analysis
                    {isCalculating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Visualizing locally reduced states. Mixed states (red arrow inside the sphere) indicate entanglement with other qubits.
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {analyzedQubits.map((qubit) => (
                        <div key={qubit.index} className="flex flex-col items-center space-y-6 p-8 bg-background/50 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
                            <div className="text-xl font-bold font-mono text-primary border-b border-primary/20 pb-3 w-full text-center">Qubit {qubit.index}</div>

                            <div className="w-full aspect-square min-h-[350px] max-w-[450px] relative my-4">
                                <BlochSphere3D
                                    vector={qubit.blochVector}
                                    purity={qubit.purity}
                                    interactive={true}
                                    showAxes={true}
                                    className="!bg-transparent"
                                />
                            </div>

                            <div className="w-full space-y-1 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">State:</span>
                                    <span className={qubit.state === 'Mixed' ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                                        {qubit.state}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Purity:</span>
                                    <span>{qubit.purity.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vector:</span>
                                    <span className="truncate ml-2" title={`[${qubit.blochVector.x.toFixed(2)}, ${qubit.blochVector.y.toFixed(2)}, ${qubit.blochVector.z.toFixed(2)}]`}>
                                        ({qubit.blochVector.x.toFixed(2)}, {qubit.blochVector.z.toFixed(2)})
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {analyzedQubits.length === 0 && !isCalculating && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            Build a circuit to see qubit states.
                        </div>
                    )}
                </div>

                {/* IBM Quantum Results Section */}
                <div className="mt-8 pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-foreground">IBM Quantum Hardware Results</h3>
                        {ibmStatus && <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-400 border-green-500/20">{ibmStatus}</Badge>}
                    </div>

                    {/* Timeline Section */}
                    {ibmTimeline && (
                        <div className="mb-8 bg-slate-900/40 rounded-xl p-6 border border-white/5 shadow-inner">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Status Timeline
                            </h4>
                            <div className="relative pl-8 space-y-8">
                                {/* Vertical Connecting Line */}
                                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-green-500/50 via-blue-500/50 to-slate-700" />

                                {ibmTimeline.map((event, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="relative flex items-start group"
                                    >
                                        {/* Status Icon */}
                                        <div className="absolute -left-[32px] top-0.5 flex items-center justify-center">
                                            <div className="bg-slate-950 rounded-full p-0.5">
                                                {event.completed ? (
                                                    <div className="bg-green-500/20 rounded-full p-1 animate-in zoom-in duration-300">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    </div>
                                                ) : event.active ? (
                                                    <div className="bg-blue-500/20 rounded-full p-1 ring-2 ring-blue-500/20 ring-offset-0">
                                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-800 rounded-full p-1 opacity-40">
                                                        <Circle className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Event Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-semibold tracking-tight transition-colors ${event.active ? 'text-blue-400' : event.completed ? 'text-slate-100' : 'text-slate-500'}`}>
                                                    {event.label}
                                                </span>
                                                {event.timestamp && (
                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                                        {event.timestamp}
                                                    </span>
                                                )}
                                            </div>
                                            {(event.description || (event.active && !event.completed)) && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="text-xs text-slate-400/80 mt-1 font-medium leading-relaxed">
                                                        {event.description || (event.active ? 'Processing on IBM servers...' : '')}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {ibmResults ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(ibmResults).map(([state, probability]) => (
                                <div key={state} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                                    <span className="font-mono text-sm font-bold text-primary">|{state}⟩</span>
                                    <div className="flex items-center gap-3 flex-1 mx-4">
                                        <div className="h-2 flex-1 bg-secondary/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(probability as number) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono w-12 text-right">
                                            {((probability as number) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground p-4 bg-muted/10 rounded-lg border border-border/20 border-dashed text-center">
                            Run the circuit on IBM Quantum hardware to see real quantum measurement results here.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CircuitAnalysis;
