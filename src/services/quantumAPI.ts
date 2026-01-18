// Quantum API service for communicating with the backend
// Handles IBM Quantum integration and circuit execution

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_URL) || 'http://localhost:3005';

export interface QuantumExecutionOptions {
  backend: 'local' | 'aer_simulator' | 'wasm';
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

// Execute quantum circuit on specified backend
export async function executeQuantumCircuit(
  circuit: any,
  options: QuantumExecutionOptions
): Promise<QuantumExecutionResult> {
  // Check if using WebAssembly simulator
  if (options.backend === 'wasm') {
    try {
      const { executeCircuit } = await import('../utils/simulation/wasm-simulator/quantumSimulator');
      const result = executeCircuit({
        circuit,
        initialState: options.initialState || 'ket0',
        customState: options.customState
      });

      return {
        success: result.success,
        method: 'wasm_simulator',
        backend: 'wasm',
        executionTime: result.executionTime,
        qubitResults: result.qubitResults,
        error: result.error
      };
    } catch (error) {
      console.error('WebAssembly execution error:', error);
      return {
        success: false,
        method: 'wasm_error',
        backend: 'wasm',
        executionTime: 0,
        error: error instanceof Error ? error.message : 'WebAssembly execution failed',
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/quantum/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Quantum execution error:', error);
    return {
      success: false,
      method: 'error',
      backend: options.backend,
      executionTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Cache management functions (REMOVED JOB METHODS)


// IBM Quantum Integration Functions
export async function connectToIBM(token: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ibm/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IBM Quantum connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to IBM Quantum service'
    };
  }
}

export async function getIBMBackends(token: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ibm/backends?token=${token}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IBM Quantum backends error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get IBM Quantum backends'
    };
  }
}

export async function executeOnIBM(token: string, backend: string, circuit: any, shots: number = 1024): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ibm/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, backend, circuit, shots }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IBM Quantum execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute on IBM Quantum'
    };
  }
}

export async function getIBMJobStatus(jobId: string, token: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ibm/job/${jobId}?token=${token}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IBM Quantum job status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get IBM Quantum job status'
    };
  }
}

// Cache management functions
export async function getCacheStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cache/stats`);
    if (!response.ok) {
      throw new Error('Failed to get cache stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Cache stats error:', error);
    return { success: false, error: 'Failed to get cache stats' };
  }
}

export async function clearCache(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cache/clear`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to clear cache');
    }
    return await response.json();
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, error: 'Failed to clear cache' };
  }
}

// Research Platform Functions
export async function runQuantumStudy(
  algorithmType: string,
  circuit: any,
  token: string,
  backend: string
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quantum-study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithmType, circuit, token, backend }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Quantum study error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run quantum study'
    };
  }
}

export async function getQuantumReport(jobId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quantum-report/${jobId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Quantum report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get quantum report'
    };
  }
}

export async function authenticateWatsonX(apiKey: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/watsonx/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('watsonx authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to authenticate with watsonx.ai'
    };
  }
}

// Export quantumAPI object for backward compatibility
export const quantumAPI = {
  executeQuantumCircuit,
  getCacheStats,
  clearCache,
  connectToIBM,
  getIBMBackends,
  executeOnIBM,
  getIBMJobStatus
};
