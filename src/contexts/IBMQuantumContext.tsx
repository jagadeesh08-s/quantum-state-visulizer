/**
 * LocalSimulatorContext — formerly IBMQuantumContext.
 *
 * Preserves all exported hook names and provider shapes so that every
 * consumer (CircuitBuilder, Workspace, Header, …) continues to compile
 * without any import changes.
 *
 * All execution now routes to the local Qiskit/Aer simulator backend.
 * No IBM Quantum token, credentials, or network calls are ever made.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
    status: string;
    label: string;
    timestamp: string;
    description?: string;
    completed: boolean;
    active: boolean;
}

export interface LocalBackend {
    id: string;
    name: string;
    qubits: number;
    status: 'online' | 'offline';
    type: 'simulator';
    description: string;
}

interface IBMQuantumContextType {
    token: string | null;
    isAuthenticated: boolean;
    backends: LocalBackend[];
    selectedBackend: string | null;
    isLoading: boolean;
    currentJob: any | null;
    jobHistory: any[];
    isHistoryLoading: boolean;
    isWatsonXAuthenticated: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    setSelectedBackend: (id: string) => void;
    submitJob: (circuit: any, shots?: number) => Promise<void>;
    fetchJobHistory: () => Promise<void>;
    runAdvantageStudy: (algorithmType: string, circuit: any) => Promise<void>;
    authenticateWatsonX: (apiKey: string) => Promise<boolean>;
}

// ─── Static local backend list ────────────────────────────────────────────────

const LOCAL_BACKENDS: LocalBackend[] = [
    {
        id: 'aer_simulator',
        name: 'aer_simulator',
        qubits: 32,
        status: 'online',
        type: 'simulator',
        description: 'High-performance Qiskit Aer statevector / QASM simulator',
    },
    {
        id: 'statevector_simulator',
        name: 'statevector_simulator',
        qubits: 30,
        status: 'online',
        type: 'simulator',
        description: 'Exact statevector simulation — no shot-sampling noise',
    },
    {
        id: 'qasm_simulator',
        name: 'qasm_simulator',
        qubits: 32,
        status: 'online',
        type: 'simulator',
        description: 'QASM-based shot-sampling simulator',
    },
];

const DEFAULT_BACKEND = 'aer_simulator';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005');

// ─── Context ──────────────────────────────────────────────────────────────────

const IBMQuantumContext = createContext<IBMQuantumContextType | undefined>(undefined);

export const IBMQuantumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedBackend, setSelectedBackend] = useState<string>(DEFAULT_BACKEND);
    const [isLoading, setIsLoading] = useState(false);
    const [currentJob, setCurrentJob] = useState<any | null>(null);
    const [jobHistory, setJobHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Local mode: always authenticated, no token needed
    const token = 'local';
    const isAuthenticated = true;
    const isWatsonXAuthenticated = false;

    const login = useCallback(async (_token: string) => {
        // No-op in local mode — already "connected"
        toast.success('Local simulator is ready — no token required!');
    }, []);

    const logout = useCallback(() => {
        // No-op in local mode
        toast.info('Local simulator mode — always connected');
    }, []);

    const fetchJobHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/ibm/jobs?token=local&limit=25`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) setJobHistory(data.jobs || []);
            }
        } catch {
            // Backend not reachable — silently ignore
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    const submitJob = useCallback(async (circuit: any, shots = 1024) => {
        setIsLoading(true);
        const jobId = `local-${Date.now()}`;
        const timeline: TimelineEvent[] = [
            { status: 'CREATED',  label: 'Created',     timestamp: new Date().toLocaleTimeString(), completed: true,  active: false },
            { status: 'RUNNING',  label: 'Executing',   timestamp: new Date().toLocaleTimeString(), completed: false, active: true  },
            { status: 'DONE',     label: 'Completed',   timestamp: '',                              completed: false, active: false },
        ];
        setCurrentJob({ jobId, status: 'RUNNING', timeline });

        try {
            const res = await fetch(`${API_BASE}/api/ibm/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'local', backend: selectedBackend, circuit, shots }),
            });

            const data = await res.json();

            const finalTimeline: TimelineEvent[] = timeline.map(e =>
                e.status === 'RUNNING'
                    ? { ...e, completed: true, active: false }
                    : e.status === 'DONE'
                    ? { ...e, timestamp: new Date().toLocaleTimeString(), completed: true, active: false }
                    : e,
            );

            if (data.success) {
                setCurrentJob({ jobId: data.jobId || jobId, status: 'DONE', results: data.results, timeline: finalTimeline });
                toast.success('Local simulation completed!');
                await fetchJobHistory();
            } else {
                setCurrentJob({ jobId, status: 'ERROR', timeline });
                toast.error(data.error || 'Simulation failed');
            }
        } catch (err) {
            setCurrentJob({ jobId, status: 'ERROR', timeline });
            toast.error('Could not reach the local backend. Is it running?');
        } finally {
            setIsLoading(false);
        }
    }, [selectedBackend, fetchJobHistory]);

    const runAdvantageStudy = useCallback(async (algorithmType: string, circuit: any) => {
        toast.info(`Running ${algorithmType} study locally…`);
        await submitJob(circuit);
    }, [submitJob]);

    const authenticateWatsonX = useCallback(async (_apiKey: string): Promise<boolean> => {
        toast.info('watsonx.ai integration is disabled in local mode');
        return false;
    }, []);

    return (
        <IBMQuantumContext.Provider value={{
            token,
            isAuthenticated,
            backends: LOCAL_BACKENDS,
            selectedBackend,
            isLoading,
            currentJob,
            jobHistory,
            isHistoryLoading,
            isWatsonXAuthenticated,
            login,
            logout,
            setSelectedBackend,
            submitJob,
            fetchJobHistory,
            runAdvantageStudy,
            authenticateWatsonX,
        }}>
            {children}
        </IBMQuantumContext.Provider>
    );
};

export const useIBMQuantum = (): IBMQuantumContextType => {
    const context = useContext(IBMQuantumContext);
    if (context === undefined) {
        throw new Error('useIBMQuantum must be used within an IBMQuantumProvider');
    }
    return context;
};
