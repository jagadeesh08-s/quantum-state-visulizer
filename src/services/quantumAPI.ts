/**
 * Quantum API Service
 * All execution routes to the local backend (Qiskit/Aer simulator).
 * IBM Quantum cloud functions are preserved as stubs for compatibility
 * but always return local-mode responses — no external calls are made.
 */

const API_BASE_URL =
    (import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_URL) ||
    'http://localhost:3005';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuantumExecutionOptions {
    backend: 'local' | 'aer_simulator' | 'wasm' | 'statevector_simulator' | 'qasm_simulator';
    shots?: number;
    initialState?: string;
    customState?: { alpha: string; beta: string };
}

export interface QuantumExecutionResult {
    success: boolean;
    method: string;
    backend: string;
    executionTime: number;
    qubitResults?: any[];
    jobId?: string;
    status?: string;
    message?: string;
    error?: string;
}

export interface JobStatus {
    jobId: string;
    status: string;
    statusMessage: string;
    progress: number;
    estimatedTime: number | null;
    backend?: string;
    results?: any;
}

// ─── Core Execution ───────────────────────────────────────────────────────────

/** Execute a quantum circuit. Uses WASM in-browser or the local backend. */
export async function executeQuantumCircuit(
    circuit: any,
    options: QuantumExecutionOptions,
): Promise<QuantumExecutionResult> {
    // WebAssembly in-browser path
    if (options.backend === 'wasm') {
        try {
            const { executeCircuit } = await import('../utils/simulation/wasm-simulator/quantumSimulator');
            const result = executeCircuit({
                circuit,
                initialState: options.initialState || 'ket0',
                customState: options.customState,
            });
            return {
                success: result.success,
                method: 'wasm_simulator',
                backend: 'wasm',
                executionTime: result.executionTime,
                qubitResults: result.qubitResults,
                error: result.error,
            };
        } catch (error) {
            return {
                success: false,
                method: 'wasm_error',
                backend: 'wasm',
                executionTime: 0,
                error: error instanceof Error ? error.message : 'WebAssembly execution failed',
            };
        }
    }

    // Local backend path
    try {
        const response = await fetch(`${API_BASE_URL}/api/quantum/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                backend: options.backend,
                circuit,
                initialState: options.initialState || 'ket0',
                customState: options.customState || { alpha: '1', beta: '0' },
                shots: options.shots || 1024,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to execute circuit');
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            method: 'error',
            backend: options.backend,
            executionTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ─── IBM-compatible stubs (local mode) ────────────────────────────────────────
// These functions preserve the existing API surface but route to local simulation.

/** "Connect" — always succeeds in local mode, no network call to IBM. */
export async function connectToIBM(_token: string): Promise<any> {
    return {
        success: true,
        hub: 'local',
        mode: 'local_simulator',
        message: 'Local simulator — no IBM token required',
    };
}

/** Returns local simulator backends. */
export async function getIBMBackends(_token: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ibm/backends?token=local`);
        if (response.ok) return await response.json();
    } catch { /* backend not running */ }
    return {
        success: true,
        backends: [
            { id: 'aer_simulator', name: 'aer_simulator', qubits: 32, status: 'online', type: 'simulator' },
            { id: 'statevector_simulator', name: 'statevector_simulator', qubits: 30, status: 'online', type: 'simulator' },
            { id: 'qasm_simulator', name: 'qasm_simulator', qubits: 32, status: 'online', type: 'simulator' },
        ],
        mode: 'local_simulator',
    };
}

/** Execute on local simulator (ignores token). */
export async function executeOnIBM(
    _token: string,
    backend: string,
    circuit: any,
    shots = 1024,
): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ibm/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'local', backend, circuit, shots }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Local execution failed',
        };
    }
}

/** Retrieve status of a local job. */
export async function getIBMJobStatus(jobId: string, _token: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ibm/job/${jobId}?token=local`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get job status',
        };
    }
}

/** Retrieve local job history. */
export async function getIBMJobHistory(_token: string, limit = 10): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ibm/jobs?token=local&limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get job history',
        };
    }
}

/** Not applicable in local mode — returns empty download URL. */
export function getIBMJobResultsDownloadUrl(jobId: string, _token: string): string {
    return `${API_BASE_URL}/api/ibm/job/${jobId}/results/download?token=local`;
}

// ─── Cache Management ─────────────────────────────────────────────────────────

export async function getCacheStats(): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cache/stats`);
        if (!response.ok) throw new Error('Failed to get cache stats');
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to get cache stats' };
    }
}

export async function clearCache(): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cache/clear`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to clear cache');
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to clear cache' };
    }
}

// ─── Research Platform ────────────────────────────────────────────────────────

export async function runQuantumStudy(
    algorithmType: string,
    circuit: any,
    _token: string,
    backend: string,
): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/quantum-study`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithmType, circuit, token: 'local', backend }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to run quantum study',
        };
    }
}

export async function getQuantumReport(jobId: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/quantum-report/${jobId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get quantum report',
        };
    }
}

/** watsonx.ai — disabled in local mode */
export async function authenticateWatsonX(_apiKey: string): Promise<any> {
    return { success: false, error: 'watsonx.ai is disabled in local simulator mode' };
}

// ─── Backward-compat export ───────────────────────────────────────────────────

export const quantumAPI = {
    executeQuantumCircuit,
    getCacheStats,
    clearCache,
    connectToIBM,
    getIBMBackends,
    executeOnIBM,
    getIBMJobStatus,
};
