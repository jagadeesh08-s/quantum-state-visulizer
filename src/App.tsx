import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/general/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { TourProvider } from '@/contexts/TourContext';
import { IBMQuantumProvider } from '@/contexts/IBMQuantumContext';

import ErrorBoundary from '@/components/general/ErrorBoundary';
import Landing from '@/pages/Landing';
import Workspace from '@/pages/Workspace';
import NotFound from '@/pages/NotFound';
import './App.css';

// Create QueryClient with optimized settings for quantum applications
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on validation errors or rate limits
        if (error?.response?.status === 400 || error?.response?.status === 429) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <IBMQuantumProvider>
              <TourProvider>
                <Router>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/workspace" element={<Workspace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Router>
              </TourProvider>
            </IBMQuantumProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
