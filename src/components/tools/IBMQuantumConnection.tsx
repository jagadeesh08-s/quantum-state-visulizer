import React, { useState } from 'react';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Key, Cpu, DoorOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface IBMQuantumConnectionProps {
    isOpen: boolean;
    onClose: () => void;
}

export const IBMQuantumConnection: React.FC<IBMQuantumConnectionProps> = ({ isOpen, onClose }) => {
    const { isAuthenticated, token, login, logout, backends, selectedBackend, setSelectedBackend, isLoading } = useIBMQuantum();
    const [newToken, setNewToken] = useState('');

    const handleConnect = async () => {
        if (newToken) {
            await login(newToken);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-indigo-500/20 shadow-2xl bg-slate-950/95 backdrop-blur-xl">
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">API Token</label>
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
            </DialogContent>
        </Dialog>
    );
};
