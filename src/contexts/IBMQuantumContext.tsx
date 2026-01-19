import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectToIBM, getIBMBackends, executeOnIBM, getIBMJobStatus } from '@/services/quantumAPI';
import { toast } from 'sonner';

export interface TimelineEvent {
    status: string;
    label: string;
    timestamp: string;
    description?: string;
    completed: boolean;
    active: boolean;
}

interface IBMQuantumContextType {
    token: string | null;
    isAuthenticated: boolean;
    backends: any[];
    selectedBackend: string | null;
    isLoading: boolean;
    currentJob: any | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    setSelectedBackend: (id: string) => void;
    submitJob: (circuit: any, shots?: number) => Promise<void>;
    runAdvantageStudy: (algorithmType: string, circuit: any) => Promise<void>;
    authenticateWatsonX: (apiKey: string) => Promise<boolean>;
    isWatsonXAuthenticated: boolean;
}

const IBMQuantumContext = createContext<IBMQuantumContextType | undefined>(undefined);

export const IBMQuantumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('ibm_token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [backends, setBackends] = useState<any[]>([]);
    const [selectedBackend, setSelectedBackend] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentJob, setCurrentJob] = useState<any | null>(null);
    const [isWatsonXAuthenticated, setIsWatsonXAuthenticated] = useState(false);

    // Function to select the best backend automatically
    const selectBestBackend = (backends: any[]) => {
        // Filter online backends first
        const onlineBackends = backends.filter(b => b.status === 'online');

        if (onlineBackends.length === 0) {
            // If no online backends, return the first one
            return backends[0];
        }

        // Prioritize processors over simulators
        const processors = onlineBackends.filter(b => b.type === 'processor');
        const targetBackends = processors.length > 0 ? processors : onlineBackends;

        // Select the one with the most qubits
        return targetBackends.reduce((best, current) =>
            current.qubits > best.qubits ? current : best
        );
    };

    useEffect(() => {
        if (token) {
            validateToken(token);
        }
    }, [token]);

    const validateToken = async (t: string) => {
        setIsLoading(true);
        console.log('[IBM Quantum] 🔐 Starting authentication...');
        console.log('[IBM Quantum] 📡 Token:', t ? `${t.substring(0, 10)}...` : 'MISSING');

        try {
            console.log('[IBM Quantum] 🌐 Connecting to backend...');
            const result = await connectToIBM(t);

            console.log('[IBM Quantum] 📥 Connection response:', result);

            if (result.success) {
                console.log('[IBM Quantum] ✅ Authentication successful!');
                console.log('[IBM Quantum] 🏢 Hub:', result.hub || 'default');

                setIsAuthenticated(true);
                localStorage.setItem('ibm_token', t);

                console.log('[IBM Quantum] 🔍 Fetching available backends...');
                const backendResult = await getIBMBackends(t);

                console.log('[IBM Quantum] 📥 Backends response:', backendResult);

                if (backendResult.success) {
                    const backendsList = backendResult.backends || [];
                    console.log(`[IBM Quantum] ✅ Found ${backendsList.length} backends`);
                    backendsList.forEach((b: any) => {
                        console.log(`[IBM Quantum]   - ${b.name} (${b.qubits} qubits, ${b.status}, ${b.type})`);
                    });

                    setBackends(backendsList);
                    if (backendsList.length > 0) {
                        // Auto-select the best backend
                        const bestBackend = selectBestBackend(backendsList);
                        setSelectedBackend(bestBackend.id);
                        console.log(`[IBM Quantum] 🎯 Auto-selected backend: ${bestBackend.name}`);
                        toast.success(`Connected to IBM Quantum. Auto-selected backend: ${bestBackend.name}`);
                    } else {
                        console.warn('[IBM Quantum] ⚠️ No backends available');
                        toast.warning('Connected but no backends available');
                    }
                } else {
                    console.error('[IBM Quantum] ❌ Failed to get backends:', backendResult.error);
                    toast.error(`Failed to get backends: ${backendResult.error || 'Unknown error'}`);
                }
            } else {
                console.error('[IBM Quantum] ❌ Authentication failed:', result.error);
                logout();
                toast.error(`Invalid IBM Quantum token: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('[IBM Quantum] ❌ Connection error:', error);
            console.error('[IBM Quantum] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            toast.error(`Could not reach backend server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
            console.log('[IBM Quantum] 🔄 Authentication process completed');
        }
    };

    const login = async (t: string) => {
        setToken(t);
    };

    const logout = () => {
        setToken(null);
        setIsAuthenticated(false);
        setBackends([]);
        setSelectedBackend(null);
        localStorage.removeItem('ibm_token');
    };

    const submitJob = async (circuit: any, shots: number = 1024) => {
        if (!token || !selectedBackend) {
            console.error('[IBM Quantum] ❌ Cannot submit job: missing token or backend');
            toast.error('Please connect to IBM Quantum first');
            return;
        }

        console.log('[IBM Quantum] 🚀 Submitting job...');
        console.log('[IBM Quantum] 📊 Circuit:', {
            qubits: circuit.numQubits,
            gates: circuit.gates?.length || 0,
            shots
        });
        console.log('[IBM Quantum] 🎯 Backend:', selectedBackend);

        setIsLoading(true);
        try {
            const result = await executeOnIBM(token, selectedBackend, circuit, shots);

            console.log('[IBM Quantum] 📥 Job submission response:', result);

            if (result.success) {
                const jobId = result.jobId;
                const status = result.status;
                console.log('[IBM Quantum] ✅ Job submitted successfully!');
                console.log('[IBM Quantum] 📋 Job ID:', jobId);
                console.log('[IBM Quantum] 📊 Status:', status);

                const initialTimeline: TimelineEvent[] = [
                    { status: 'CREATED', label: 'Created', timestamp: new Date().toLocaleTimeString(), completed: true, active: false },
                    { status: 'QUEUED', label: 'Pending', timestamp: '', completed: false, active: true },
                    { status: 'RUNNING', label: 'In progress', timestamp: '', completed: false, active: false },
                    { status: 'DONE', label: 'Completed', timestamp: '', completed: false, active: false }
                ];

                setCurrentJob({ jobId, status, timeline: initialTimeline });
                toast.success(`Job submitted to IBM Quantum (ID: ${jobId.substring(0, 8)}...)`);
                startPolling(jobId, initialTimeline);
            } else {
                console.error('[IBM Quantum] ❌ Job submission failed:', result.error);
                toast.error(result.error || 'Failed to submit job');
            }
        } catch (error) {
            console.error('[IBM Quantum] ❌ Execution error:', error);
            console.error('[IBM Quantum] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            toast.error(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const authenticateWatsonX = async (apiKey: string) => {
        setIsLoading(true);
        try {
            const { authenticateWatsonX: authWatsonX } = await import('@/services/quantumAPI');
            const result = await authWatsonX(apiKey);
            if (result.success) {
                setIsWatsonXAuthenticated(true);
                toast.success('watsonx.ai authenticated successfully');
                return true;
            }
            toast.error(result.error || 'watsonx.ai authentication failed');
            return false;
        } catch (error) {
            toast.error('Could not authenticate with watsonx.ai');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const runAdvantageStudy = async (algorithmType: string, circuit: any) => {
        if (!token || !selectedBackend) {
            toast.error('Please connect to IBM Quantum first');
            return;
        }

        setIsLoading(true);
        console.log(`[Research Platform] 🧪 Running ${algorithmType} study...`);

        try {
            const { runQuantumStudy } = await import('@/services/quantumAPI');
            const result = await runQuantumStudy(algorithmType, circuit, token, selectedBackend);

            if (result.success) {
                toast.success(`Quantum Advantage Study started: ${algorithmType}`);
                const initialTimeline: TimelineEvent[] = [
                    { status: 'CREATED', label: 'Created', timestamp: new Date().toLocaleTimeString(), completed: true, active: false },
                    { status: 'QUEUED', label: 'Pending', timestamp: '', completed: false, active: true },
                    { status: 'RUNNING', label: 'In progress', timestamp: '', completed: false, active: false },
                    { status: 'DONE', label: 'Completed', timestamp: '', completed: false, active: false }
                ];
                setCurrentJob({ jobId: result.jobId, status: 'RUNNING', isStudy: true, timeline: initialTimeline });
                if (result.jobId) startPolling(result.jobId, initialTimeline);
            } else {
                toast.error(result.error || 'Failed to start study');
            }
        } catch (error) {
            toast.error('Study execution error');
        } finally {
            setIsLoading(false);
        }
    };

    const startPolling = (jobId: string, initialTimeline: TimelineEvent[]) => {
        console.log('[IBM Quantum] 🔄 Starting job polling for:', jobId);
        let pollCount = 0;
        let timeline = [...initialTimeline];
        const maxPolls = 100; // Max 5 minutes (100 * 3s)

        const interval = setInterval(async () => {
            if (!token) {
                console.log('[IBM Quantum] ⚠️ Token missing, stopping polling');
                clearInterval(interval);
                return;
            }

            pollCount++;
            console.log(`[IBM Quantum] 🔍 Polling job status (attempt ${pollCount}/${maxPolls})...`);

            try {
                const result = await getIBMJobStatus(jobId, token);

                const status = result.status;
                console.log(`[IBM Quantum] 📊 Job status: ${status}`);

                // Update timeline based on status
                const now = new Date().toLocaleTimeString();
                let updatedTimeline = timeline.map(event => {
                    if (status === 'DONE' && event.status === 'DONE') {
                        return { ...event, timestamp: now, completed: true, active: false };
                    }
                    if (status === 'ERROR' && (event.status === 'RUNNING' || event.status === 'QUEUED')) {
                        return { ...event, active: false, completed: false, label: event.label + ' (Failed)', description: 'Job execution encountered an error' };
                    }
                    if (event.status === status) {
                        return { ...event, timestamp: event.timestamp || now, active: true, completed: false };
                    }
                    if (status === 'RUNNING' && (event.status === 'QUEUED' || event.status === 'CREATED')) {
                        return { ...event, completed: true, active: false };
                    }
                    if (status === 'DONE' && event.status !== 'DONE') {
                        return { ...event, completed: true, active: false };
                    }
                    return event;
                });

                // Add special description for RUNNING status to simulate "usage"
                if (status === 'RUNNING') {
                    updatedTimeline = updatedTimeline.map(event =>
                        event.status === 'RUNNING'
                            ? { ...event, description: `Qiskit Runtime usage: ${pollCount * 3}s` }
                            : event
                    );
                }

                timeline = updatedTimeline;
                setCurrentJob({ ...result, timeline: updatedTimeline });

                if (status === 'DONE' || status === 'ERROR' || status === 'CANCELLED') {
                    clearInterval(interval);

                    if (status === 'DONE') {
                        const results = result.results;
                        console.log('[IBM Quantum] ✅ Job completed successfully!');
                        console.log('[IBM Quantum] 📊 Results:', results);
                        console.log('[IBM Quantum] ⏱️ Execution time:', result.executionTime || 'N/A', 'seconds');

                        if (results) {
                            const resultKeys = Object.keys(results);
                            console.log(`[IBM Quantum] 📈 Measurement outcomes: ${resultKeys.length}`);
                            // Log first few results
                            const sample = Object.entries(results).slice(0, 5);
                            sample.forEach(([key, value]) => {
                                console.log(`[IBM Quantum]   ${key}: ${value}`);
                            });
                        }

                        toast.success('IBM Quantum job completed!');
                    } else {
                        console.error(`[IBM Quantum] ❌ Job ${status.toLowerCase()}`);
                        toast.error(`Job ${status.toLowerCase()}`);
                    }
                } else if (pollCount >= maxPolls) {
                    clearInterval(interval);
                    console.warn('[IBM Quantum] ⚠️ Polling timeout reached');
                    toast.warning('Job polling timeout - check status manually');
                }
            } catch (error) {
                console.error('[IBM Quantum] ❌ Polling error:', error);
                clearInterval(interval);
                toast.error('Error checking job status');
            }
        }, 3000);
    };

    return (
        <IBMQuantumContext.Provider value={{
            token, isAuthenticated, backends, selectedBackend, isLoading, currentJob, isWatsonXAuthenticated,
            login, logout, setSelectedBackend, submitJob, runAdvantageStudy, authenticateWatsonX
        }}>
            {children}
        </IBMQuantumContext.Provider>
    );
};

export const useIBMQuantum = () => {
    const context = useContext(IBMQuantumContext);
    if (context === undefined) {
        throw new Error('useIBMQuantum must be used within an IBMQuantumProvider');
    }
    return context;
};
