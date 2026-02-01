import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for quantum operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error handling
    if (error.response?.status === 429) {
      // Rate limited
      console.warn('Rate limit exceeded, retrying in', error.response.headers['retry-after'], 'seconds');
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Query Keys
export const queryKeys = {
  health: ['health'] as const,
  cache: ['cache'] as const,
  backends: ['backends'] as const,
  simulation: (circuit: any, backend: string, shots: number) =>
    ['simulation', circuit, backend, shots] as const,
  ibmJob: (jobId: string) => ['ibm-job', jobId] as const,
  aiQuestion: (question: string) => ['ai-question', question] as const,
  medicalStatus: ['medical-status'] as const,
  workerStatus: ['worker-status'] as const,
  quantumML: {
    datasets: ['quantum-ml', 'datasets'] as const,
    evaluation: ['quantum-ml', 'evaluation'] as const,
  },
};

// Health Check Hook
export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
  });
};

// Cache Stats Hook
export const useCacheStats = () => {
  return useQuery({
    queryKey: queryKeys.cache,
    queryFn: async () => {
      const response = await apiClient.get('/api/cache/stats');
      return response.data;
    },
    staleTime: 10000, // Cache stats change frequently
  });
};

// Available Backends Hook
export const useBackends = () => {
  return useQuery({
    queryKey: queryKeys.backends,
    queryFn: async () => {
      const response = await apiClient.get('/api/quantum/backends');
      return response.data;
    },
    staleTime: 300000, // Backends don't change often (5 minutes)
  });
};

// IBM Backends Hook (requires token)
export const useIBMBackends = (token: string) => {
  return useQuery({
    queryKey: ['ibm-backends', token],
    queryFn: async () => {
      const response = await apiClient.get('/api/ibm/backends', {
        params: { token }
      });
      return response.data;
    },
    enabled: !!token && token.length > 10, // Only run if token is provided
    staleTime: 300000, // 5 minutes
  });
};

// Circuit Simulation Hook
export const useCircuitSimulation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      circuit,
      backend = 'local',
      shots = 1024,
      token,
      initialState,
      customState
    }: {
      circuit: any;
      backend?: string;
      shots?: number;
      token?: string;
      initialState?: string;
      customState?: any;
    }) => {
      const response = await apiClient.post('/api/quantum/execute', {
        circuit,
        backend,
        shots,
        token,
        initialState,
        customState,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Cache the successful result
      if (variables.backend && variables.shots) {
        queryClient.setQueryData(
          queryKeys.simulation(variables.circuit, variables.backend, variables.shots),
          data
        );
      }
    },
  });

  return mutation;
};

// IBM Job Submission Hook
export const useIBMJobSubmission = () => {
  return useMutation({
    mutationFn: async ({
      token,
      backend,
      circuit,
      shots,
      instance
    }: {
      token: string;
      backend: string;
      circuit: any;
      shots: number;
      instance?: string;
    }) => {
      const response = await apiClient.post('/api/ibm/execute', {
        token,
        backend,
        circuit,
        shots,
        instance,
      });
      return response.data;
    },
  });
};

// IBM Job Status Hook
export const useIBMJobStatus = (jobId: string, token: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.ibmJob(jobId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/ibm/job/${jobId}`, {
        params: { token }
      });
      return response.data;
    },
    enabled: enabled && !!jobId && !!token,
    refetchInterval: (query) => {
      // Poll more frequently if job is running
      const data = query.state.data;
      if (data && typeof data === 'object' && 'status' in data) {
        const status = (data as any).status;
        if (status === 'RUNNING' || status === 'QUEUED') {
          return 5000; // 5 seconds
        }
      }
      return false; // Stop polling when completed
    },
    staleTime: 1000, // Job status changes quickly
  });
};

// AI Question Hook
export const useAIQuestion = () => {
  return useMutation({
    mutationFn: async (question: string) => {
      const response = await apiClient.post('/api/ai/ask', {
        question,
      });
      return response.data;
    },
    onSuccess: (data, question) => {
      // Cache the AI response
      queryClient.setQueryData(queryKeys.aiQuestion(question), data);
    },
  });
};

// Medical Status Hook
export const useMedicalStatus = () => {
  return useQuery({
    queryKey: queryKeys.medicalStatus,
    queryFn: async () => {
      const response = await apiClient.get('/api/medical/status');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
};

// Worker Status Hook
export const useWorkerStatus = () => {
  return useQuery({
    queryKey: queryKeys.workerStatus,
    queryFn: async () => {
      const response = await apiClient.get('/api/quantum/workers/status');
      return response.data;
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Quantum ML Dataset Generation Hook
export const useQuantumMLDatasets = () => {
  return useMutation({
    mutationFn: async ({
      type = 'classification',
      subtype = 'circles',
      numSamples = 100
    }: {
      type?: string;
      subtype?: string;
      numSamples?: number;
    }) => {
      const response = await apiClient.post('/api/quantum-ml/datasets/generate', {
        type,
        subtype,
        numSamples,
      });
      return response.data;
    },
  });
};

// Quantum ML Model Evaluation Hook
export const useQuantumMLEvaluation = () => {
  return useMutation({
    mutationFn: async ({
      predictions,
      trueLabels,
      targets,
      type = 'classification'
    }: {
      predictions: number[];
      trueLabels?: number[];
      targets?: number[];
      type?: string;
    }) => {
      const response = await apiClient.post('/api/quantum-ml/evaluation', {
        predictions,
        trueLabels,
        targets,
        type,
      });
      return response.data;
    },
  });
};

// Cache Management Hooks
export const useClearCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/api/cache/clear');
      return response.data;
    },
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();
    },
  });
};

// Export the API client for direct usage if needed
export { apiClient };