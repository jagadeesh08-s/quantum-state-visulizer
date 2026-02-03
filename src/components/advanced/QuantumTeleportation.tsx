import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, RotateCcw, Play, CheckCircle2, Share2, Zap } from 'lucide-react';
import BlochSphere3D from '@/components/core/BlochSphere';
import { toast } from 'sonner';

// Complex number helper
interface Complex { re: number; im: number; }
// @ts-ignore
const add = (a: Complex, b: Complex) => ({ re: a.re + b.re, im: a.im + b.im });
// @ts-ignore
const mul = (a: Complex, b: Complex) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
// @ts-ignore
const mag = (a: Complex) => Math.sqrt(a.re * a.re + a.im * a.im);

const QuantumTeleportation: React.FC = () => {
    const [step, setStep] = useState(0);
    // Input state (Qubit 0) - initialized to |0>
    const [theta, setTheta] = useState(0); // 0 to PI
    const [phi, setPhi] = useState(0);     // 0 to 2PI

    // Measurement results
    const [measurement, setMeasurement] = useState<{ m1: number; m2: number } | null>(null);

    // Computed states for visualization
    const [aliceState, setAliceState] = useState({ x: 0, y: 0, z: 1 });
    const [bobState, setBobState] = useState({ x: 0, y: 0, z: 1 });
    const [entangledState, setEntangledState] = useState<{ x: number, y: number, z: number } | null>(null);

    // Update Alice's state vector based on theta/phi
    useEffect(() => {
        // Bloch vector conversion
        // x = sin(theta) * cos(phi)
        // y = sin(theta) * sin(phi)
        // z = cos(theta)
        setAliceState({
            x: Math.sin(theta) * Math.cos(phi),
            y: Math.sin(theta) * Math.sin(phi),
            z: Math.cos(theta)
        });
    }, [theta, phi]);

    // Handle Teleportation Logic
    const runTeleportation = async () => {
        setStep(1); // Entanglement
        await new Promise(r => setTimeout(r, 1000));

        // In step 1, Q1 and Q2 are entangled (Bell state). 
        // Individually they look maximally mixed (0,0,0) on Bloch sphere if we trace out.
        // visualizing entangled pair is tricky on Bloch sphere, but we can show "link" or just show them as mixed.
        setEntangledState({ x: 0, y: 0, z: 0 }); // Mixed state representation

        setStep(2); // Bell Measurement
        await new Promise(r => setTimeout(r, 1000));

        // Simulate random measurement outcome (00, 01, 10, 11)
        const m1 = Math.random() < 0.5 ? 0 : 1;
        const m2 = Math.random() < 0.5 ? 0 : 1;
        setMeasurement({ m1, m2 });

        // After measurement, Qubit 2 collapses to one of 4 states related to input |psi>
        // If 00: |psi>
        // If 01: X|psi>
        // If 10: Z|psi>
        // If 11: XZ|psi>

        // We calculate what Bob's qubit looks like BEFORE correction
        // We can simulate this by applying the Pauli gates to the input bloch vector
        let bx = aliceState.x;
        let by = aliceState.y;
        let bz = aliceState.z;

        // Apply X if m2=1 (Note: Convention mapping varies, usually M2 is from Q1 => X correction)
        // Let's use standard: 
        // M1 (Q0) -> Z correction
        // M2 (Q1) -> X correction

        if (m2 === 1) { // Apply X (Rotate 180 around X) -> (x, -y, -z)
            by = -by;
            bz = -bz;
        }
        if (m1 === 1) { // Apply Z (Rotate 180 around Z) -> (-x, -y, z)
            bx = -bx;
            by = -by;
        }

        setBobState({ x: bx, y: by, z: bz });

        setStep(3); // Classical Communication
        await new Promise(r => setTimeout(r, 1500));

        setStep(4); // Correction
        // Applying correction restores state
        setBobState(aliceState);
        toast.success("Teleportation Successful!");
    };

    const reset = () => {
        setStep(0);
        setMeasurement(null);
        setBobState({ x: 0, y: 0, z: 1 });
        setEntangledState(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* Left Control Panel */}
            <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Quantum Teleportation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-blue-500/10 border-blue-500/20">
                            <AlertDescription className="text-sm">
                                Teleport the state of <strong>Alice's Qubit</strong> to <strong>Bob's Qubit</strong> using entanglement and classical communication.
                            </AlertDescription>
                        </Alert>

                        {/* State Preparation Controls (Only active at start) */}
                        <div className={`space-y-4 ${step > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">1. Prepare Input State</h3>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline" size="sm" className="h-6 w-8 text-xs font-mono"
                                        onClick={() => { setTheta(0); setPhi(0); }}
                                        title="|0⟩"
                                    >
                                        |0⟩
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="h-6 w-8 text-xs font-mono"
                                        onClick={() => { setTheta(Math.PI); setPhi(0); }}
                                        title="|1⟩"
                                    >
                                        |1⟩
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="h-6 w-8 text-xs font-mono"
                                        onClick={() => { setTheta(Math.PI / 2); setPhi(0); }}
                                        title="|+⟩"
                                    >
                                        |+⟩
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="h-6 w-8 text-xs font-mono"
                                        onClick={() => { setTheta(Math.PI / 2); setPhi(Math.PI); }}
                                        title="|-⟩"
                                    >
                                        |-⟩
                                    </Button>
                                    <Button
                                        variant="outline" size="sm" className="h-6 w-8 text-xs font-mono"
                                        onClick={() => { setTheta(Math.PI / 2); setPhi(Math.PI / 2); }}
                                        title="|i⟩"
                                    >
                                        |i⟩
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>Theta (θ)</span>
                                    <span>{(theta / Math.PI).toFixed(2)}π</span>
                                </div>
                                <Slider
                                    value={[theta]}
                                    max={Math.PI}
                                    step={0.01}
                                    onValueChange={([v]) => setTheta(v)}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>Phi (φ)</span>
                                    <span>{(phi / Math.PI).toFixed(2)}π</span>
                                </div>
                                <Slider
                                    value={[phi]}
                                    max={2 * Math.PI}
                                    step={0.01}
                                    onValueChange={([v]) => setPhi(v)}
                                />
                            </div>
                        </div>

                        {/* Protocol Steps */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Protocol Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className={`flex items-center gap-3 p-2 rounded ${step === 1 ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'}`}>
                                    <Badge variant={step > 1 ? "default" : "outline"}>1</Badge>
                                    <span>Entangle Alice & Bob (Bell Pair)</span>
                                </div>
                                <div className={`flex items-center gap-3 p-2 rounded ${step === 2 ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'}`}>
                                    <Badge variant={step > 2 ? "default" : "outline"}>2</Badge>
                                    <span>Bell Measurement on Alice's side</span>
                                </div>
                                <div className={`flex items-center gap-3 p-2 rounded ${step === 3 ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'}`}>
                                    <Badge variant={step > 3 ? "default" : "outline"}>3</Badge>
                                    <span>Classical Transfer (2 bits)</span>
                                    {measurement && (
                                        <Badge variant="secondary" className="ml-auto font-mono">
                                            {measurement.m1}{measurement.m2}
                                        </Badge>
                                    )}
                                </div>
                                <div className={`flex items-center gap-3 p-2 rounded ${step === 4 ? 'bg-green-500/20 border border-green-500/30' : 'bg-muted/30'}`}>
                                    <Badge variant={step === 4 ? "default" : "outline"} className={step === 4 ? "bg-green-600" : ""}>4</Badge>
                                    <span>Apply Correction to Bob</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {step === 0 ? (
                                <Button onClick={runTeleportation} className="w-full">
                                    <Play className="w-4 h-4 mr-2" /> Start Teleportation
                                </Button>
                            ) : (
                                <Button onClick={reset} variant="outline" className="w-full">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Reset
                                </Button>
                            )}
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Right Visualization Panel */}
            <div className="lg:col-span-8 flex flex-col gap-6">

                {/* Alice's Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-1/2 min-h-[300px]">
                    <Card className="relative overflow-hidden border-blue-500/30">
                        <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur px-2 py-1 rounded border text-xs font-bold text-blue-500">
                            Alice (Input State |ψ⟩)
                        </div>
                        <div className="h-full w-full min-h-[300px]">
                            <BlochSphere3D
                                vector={aliceState}
                                interactive={true}
                            />
                        </div>
                    </Card>

                    {/* Bob's Output */}
                    <Card className={`relative overflow-hidden transition-all duration-500 ${step === 4 ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-purple-500/30'}`}>
                        <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur px-2 py-1 rounded border text-xs font-bold text-purple-500">
                            Bob (Output)
                        </div>

                        {step < 4 && measurement && (
                            <div className="absolute top-12 left-2 z-10 text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded border border-red-500/20">
                                Uncorrected State (Noise)
                            </div>
                        )}

                        <div className="h-full w-full min-h-[300px]">
                            {step === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    Waiting for entanglement...
                                </div>
                            ) : (
                                <BlochSphere3D
                                    vector={bobState}
                                    interactive={true}
                                />
                            )}
                        </div>
                    </Card>
                </div>

                {/* Transmission Animation Area */}
                {step > 0 && (
                    <Card className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-r from-background to-secondary/20">
                        <h3 className="text-sm font-semibold mb-8 text-muted-foreground">Quantum Network Channel</h3>

                        <div className="flex items-center justify-between w-full max-w-2xl relative">
                            {/* Alice Node */}
                            <div className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-500 bg-blue-500/20' : 'border-muted'}`}>
                                    A
                                </div>
                                <span className="text-xs">Alice</span>
                            </div>

                            {/* Connection Line */}
                            <div className="absolute top-6 left-12 right-12 h-0.5 bg-muted overflow-hidden">
                                {step === 1 && (
                                    <div className="h-full w-1/2 bg-yellow-400 animate-[pulse_2s_infinite]" />
                                )}
                                {step === 3 && (
                                    <div className="h-full w-full bg-primary origin-left animate-[scale-x_1s_ease-out]" />
                                )}
                            </div>

                            {/* Bob Node */}
                            <div className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${step >= 4 ? 'border-green-500 bg-green-500/20' : 'border-muted'}`}>
                                    B
                                </div>
                                <span className="text-xs">Bob</span>
                            </div>
                        </div>

                        {step === 3 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in zoom-in slide-in-from-left duration-700">
                                <Share2 className="w-4 h-4 text-primary" />
                                <span className="text-xs font-mono">Bits: {measurement?.m1}{measurement?.m2}</span>
                            </div>
                        )}
                    </Card>
                )}

            </div>
        </div>
    );
};

export default QuantumTeleportation;
