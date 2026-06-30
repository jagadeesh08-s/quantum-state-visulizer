/**
 * SimulatorSettings — formerly IBMQuantumConnection.
 *
 * Repurposed as a local simulator configuration panel.
 * Preserves the same props interface (isOpen / onClose) so that
 * every call-site in Header.tsx and elsewhere continues to work.
 */
import React, { useState } from 'react';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Cpu, CheckCircle2, Zap, Activity, Server } from 'lucide-react';
import { toast } from 'sonner';

interface IBMQuantumConnectionProps {
    isOpen: boolean;
    onClose: () => void;
}

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

const NOISE_MODELS = [
    { id: 'none',         label: 'None — ideal simulation',           description: 'Perfect gates, no decoherence' },
    { id: 'depolarizing', label: 'Depolarizing noise',                description: 'Symmetric qubit error model' },
    { id: 'thermal',      label: 'Thermal relaxation (T1/T2)',        description: 'Realistic device noise model' },
];

export const IBMQuantumConnection: React.FC<IBMQuantumConnectionProps> = ({ isOpen, onClose }) => {
    const { backends, selectedBackend, setSelectedBackend } = useIBMQuantum();

    const [shots, setShots] = useState<number>(1024);
    const [noiseModel, setNoiseModel] = useState<string>('none');
    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Persist Gemini key locally
            if (geminiKey.trim()) {
                localStorage.setItem('gemini_api_key', geminiKey.trim());
            } else {
                localStorage.removeItem('gemini_api_key');
            }

            // Push Gemini key to backend at runtime if possible
            if (geminiKey.trim()) {
                fetch(`${BACKEND_URL}/api/update-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gemini_api_key: geminiKey.trim() }),
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        toast.success('Settings saved & applied!');
                    } else {
                        toast.success('Saved locally. Restart backend to apply AI key.');
                    }
                })
                .catch(() => {
                    toast.success('Saved locally. Backend not reachable.');
                });
            } else {
                toast.success('Settings saved.');
            }

            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const geminiSaved = !!localStorage.getItem('gemini_api_key');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px] border-primary/20 shadow-2xl bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-primary" />
                        </div>
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Simulator Settings
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure your local Qiskit/Aer quantum simulator
                    </DialogDescription>
                </DialogHeader>

                {/* Status Banner */}
                <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Local Simulator — Online
                        </span>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs border-green-500/30 text-green-600 dark:text-green-400">
                        <Server className="w-3 h-3 mr-1" /> Local
                    </Badge>
                </div>

                {/* Backend Selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Active Backend
                    </Label>
                    <Select value={selectedBackend || 'aer_simulator'} onValueChange={setSelectedBackend}>
                        <SelectTrigger className="bg-background/50 border-border/50 focus:ring-primary/30">
                            <SelectValue placeholder="Select backend…" />
                        </SelectTrigger>
                        <SelectContent>
                            {backends.map(b => (
                                <SelectItem key={b.id} value={b.id}>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{b.name}</span>
                                        <span className="text-xs text-muted-foreground">{b.description} · {b.qubits} qubits</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Shots Slider */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-accent" />
                        Default Shots
                        <Badge variant="secondary" className="ml-auto text-xs">{shots.toLocaleString()}</Badge>
                    </Label>
                    <Slider
                        value={[shots]}
                        onValueChange={([v]) => setShots(v)}
                        min={128}
                        max={16384}
                        step={128}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>128 (fast)</span>
                        <span>16 384 (precise)</span>
                    </div>
                </div>

                {/* Noise Model */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Noise Model</Label>
                    <div className="grid gap-2">
                        {NOISE_MODELS.map(nm => (
                            <button
                                key={nm.id}
                                onClick={() => setNoiseModel(nm.id)}
                                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                                    noiseModel === nm.id
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border/40 bg-background/30 hover:border-primary/30 hover:bg-primary/3'
                                }`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    noiseModel === nm.id ? 'border-primary' : 'border-muted-foreground/40'
                                }`}>
                                    {noiseModel === nm.id && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{nm.label}</p>
                                    <p className="text-xs text-muted-foreground">{nm.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Optional Gemini AI Key */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                        AI Assistant Key
                        {geminiSaved && (
                            <Badge variant="outline" className="ml-auto text-xs border-green-500/30 text-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Saved
                            </Badge>
                        )}
                    </Label>
                    <input
                        type="password"
                        value={geminiKey}
                        onChange={e => setGeminiKey(e.target.value)}
                        placeholder="Gemini API key (optional)"
                        className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-xs text-muted-foreground">
                        Powers the AI Tutor. Leave blank to use the app without AI features.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                        {isSaving ? (
                            <>Saving…</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Apply Settings</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
