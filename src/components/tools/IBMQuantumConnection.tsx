import React, { useState } from 'react';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Key, Cpu, DoorOpen, ExternalLink, ShieldCheck, Sparkles, Database, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface IBMQuantumConnectionProps {
    isOpen: boolean;
    onClose: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3005';

export const IBMQuantumConnection: React.FC<IBMQuantumConnectionProps> = ({ isOpen, onClose }) => {
    const { isAuthenticated, token, login, logout, backends, selectedBackend, setSelectedBackend, isLoading } = useIBMQuantum();
    const [newToken, setNewToken] = useState('');

    // Optional extras - pre-fill from localStorage
    const [showOptional, setShowOptional] = useState(false);
    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
    const [driveUrl, setDriveUrl] = useState(() => localStorage.getItem('google_drive_url') || '');
    const [isSavingOptional, setIsSavingOptional] = useState(false);

    const handleConnect = async () => {
        if (newToken) {
            await login(newToken);
        }
    };

    const handleSaveOptionals = async () => {
        setIsSavingOptional(true);
        try {
            // Persist to localStorage immediately
            if (geminiKey.trim()) {
                localStorage.setItem('gemini_api_key', geminiKey.trim());
            } else {
                localStorage.removeItem('gemini_api_key');
            }

            if (driveUrl.trim()) {
                localStorage.setItem('google_drive_url', driveUrl.trim());
            } else {
                localStorage.removeItem('google_drive_url');
            }

            // Push to backend so the running server can use them without restart
            const payload: Record<string, string> = {};
            if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
            if (driveUrl.trim()) payload.google_drive_url = driveUrl.trim();

            if (Object.keys(payload).length > 0) {
                try {
                    const res = await fetch(`${BACKEND_URL}/api/update-config`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (data.success) {
                        toast.success('Configuration saved & applied to backend!');
                    } else {
                        toast.warning('Saved locally. Backend update failed: ' + (data.error || 'unknown'));
                    }
                } catch {
                    // Backend might not be running – silently save locally only
                    toast.success('Saved locally. Start the backend to apply server-side.');
                }
            } else {
                toast.success('Optional keys cleared.');
            }
        } finally {
            setIsSavingOptional(false);
        }
    };

    const geminiSaved = !!localStorage.getItem('gemini_api_key');
    const driveSaved = !!localStorage.getItem('google_drive_url');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] border-indigo-500/20 shadow-2xl bg-slate-950/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        <Cpu className="h-6 w-6 text-indigo-400" />
                        IBM Quantum Connection
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Connect to IBM Quantum hardware or simulators using your API token.
                    </DialogDescription>
                </DialogHeader>

                {!isAuthenticated ? (
                    <div className="space-y-6 py-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                                <p className="text-sm text-slate-400">Auto-connecting to IBM Quantum...</p>
                            </div>
                        ) : (
                            <>
                                {/* ── IBM Token ───────────────────────────────── */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">IBM Quantum API Token</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                            <Input
                                                placeholder="Enter your IBM Quantum token"
                                                value={newToken}
                                                onChange={(e) => setNewToken(e.target.value)}
                                                className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 focus:border-indigo-500/50 transition-all"
                                                type="password"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleConnect}
                                            disabled={isLoading || !newToken}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                                        >
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                                        <ExternalLink className="h-3 w-3" />
                                        Get your token from{' '}
                                        <a
                                            href="https://quantum.ibm.com/"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-400 hover:underline"
                                        >
                                            IBM Quantum Dashboard
                                        </a>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/20">
                                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-200">Connected</p>
                                    <p className="text-xs text-slate-400">Authorized Session</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={logout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <DoorOpen className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-300">Select Target Backend</label>
                            <ScrollArea className="h-[200px] rounded-xl border border-slate-800 bg-slate-900/50 p-2">
                                <div className="space-y-2">
                                    {backends.map((backend) => (
                                        <div
                                            key={backend.id}
                                            onClick={() => setSelectedBackend(backend.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${selectedBackend === backend.id
                                                ? 'border-indigo-500/50 bg-indigo-500/10'
                                                : 'border-transparent hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Cpu className={`h-4 w-4 ${selectedBackend === backend.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                <span className="text-sm font-medium text-slate-200">{backend.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-950 border-slate-800">
                                                    {backend.qubits} Qubits
                                                </Badge>
                                                <div className={`w-2 h-2 rounded-full ${backend.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={backend.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                )}

                {/* ── Optional: Gemini API Key + Google Drive Link ──────── */}
                <div className="border-t border-slate-800/60 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowOptional((v) => !v)}
                        className="flex items-center gap-2 w-full text-left text-sm text-slate-400 hover:text-slate-200 transition-colors group"
                    >
                        <span className="flex-1 font-medium">
                            Optional Integrations
                            {(geminiSaved || driveSaved) && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" /> Configured
                                </span>
                            )}
                        </span>
                        {showOptional
                            ? <ChevronUp className="h-4 w-4 group-hover:text-indigo-400 transition-colors" />
                            : <ChevronDown className="h-4 w-4 group-hover:text-indigo-400 transition-colors" />
                        }
                    </button>

                    {showOptional && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {/* Gemini API Key */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                                    Gemini API Key
                                    <span className="text-[10px] text-slate-500 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="gemini-api-key"
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        className="pl-9 text-sm bg-slate-900/50 border-slate-800 text-slate-200 focus:border-yellow-500/50 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    Get a free key at{' '}
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-yellow-400/80 hover:underline">
                                        Google AI Studio
                                    </a>
                                    . Powers the AI Quantum Assistant.
                                </p>
                            </div>

                            {/* Google Drive URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                    <Database className="h-3.5 w-3.5 text-cyan-400" />
                                    Google Drive Dataset URL
                                    <span className="text-[10px] text-slate-500 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <ExternalLink className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="google-drive-url"
                                        type="url"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={driveUrl}
                                        onChange={(e) => setDriveUrl(e.target.value)}
                                        className="pl-9 text-sm bg-slate-900/50 border-slate-800 text-slate-200 focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Paste a shared Google Drive folder or file link. Used by the Medical Analysis module to load your dataset.
                                </p>
                            </div>

                            <Button
                                onClick={handleSaveOptionals}
                                disabled={isSavingOptional}
                                size="sm"
                                className="w-full bg-gradient-to-r from-yellow-600/80 to-cyan-700/80 hover:from-yellow-600 hover:to-cyan-700 text-white border-0 shadow-md"
                            >
                                {isSavingOptional ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Saving...</>
                                ) : (
                                    <><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Save Optional Keys</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
