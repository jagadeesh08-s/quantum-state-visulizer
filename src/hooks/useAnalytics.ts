import { useState, useEffect, useCallback, useRef } from 'react';

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  action: string;
  category: string;
  duration?: number;
  success: boolean;
  metadata?: any;
}

export interface UserSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  actions: AnalyticsEvent[];
  tabUsage: { [tab: string]: number };
}

export interface RealAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  averageSessionTime: number;
  popularFeatures: { name: string; usage: number }[];
  errorRate: number;
  completionRate: number;
  userRetention: number;
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    quantumJobsProcessed: number;
    averageJobTime: number;
    cacheHitRate: number;
    uptime: number;
  };
  learningMetrics: {
    totalLearners: number;
    completedTutorials: number;
    averageProgress: number;
    popularTopics: { topic: string; learners: number }[];
    skillDistribution: { skill: string; level: number }[];
    assessmentScores: number[];
  };
}

const STORAGE_KEY = 'blochverse_analytics';
const SESSION_KEY = 'blochverse_session';

export const useAnalytics = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [analyticsData, setAnalyticsData] = useState<RealAnalyticsData | null>(null);

  // Generate or retrieve user ID
  const getUserId = useCallback(() => {
    let userId = localStorage.getItem('blochverse_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('blochverse_user_id', userId);
    }
    return userId;
  }, []);

  // Generate or retrieve session ID
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }, []);

  const pendingEventsRef = useRef<any[]>([]);

  // Track an event
  const trackEvent = useCallback((action: string, category: string, metadata?: any, duration?: number) => {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: getUserId(),
      sessionId: getSessionId(),
      action,
      category,
      duration,
      success: true,
      metadata
    };

    setEvents(prev => [...prev, event]);

    // Update session data
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        actions: [...prev.actions, event],
        tabUsage: {
          ...prev.tabUsage,
          [category]: (prev.tabUsage[category] || 0) + 1
        }
      };
    });

    // Persist to localStorage
    const storedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    storedEvents.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedEvents.slice(-1000)));

    // Queue for backend sync
    pendingEventsRef.current.push({
      userId: getUserId(),
      sessionId: getSessionId(),
      action,
      category,
      duration,
      metadata
    });
  }, [getUserId, getSessionId]);

  // Flush queued events periodically to prevent network flooding
  useEffect(() => {
    const flushEvents = async () => {
      if (pendingEventsRef.current.length === 0) return;

      // Take a snapshot of current events and clear the queue
      const eventsToSend = [...pendingEventsRef.current];
      pendingEventsRef.current = [];

      // Send events sequentially with a small delay to avoid "INSUFFICIENT_RESOURCES"
      for (const evt of eventsToSend) {
        try {
          await fetch('http://localhost:3005/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evt)
          });
        } catch (e) {
          // Silently fail or warn to avoid console spam
          console.debug('Analytics sync skipped:', e);
        }
        // Small throttle between requests
        await new Promise(r => setTimeout(r, 50));
      }
    };

    // Flush every 5 seconds
    const interval = setInterval(flushEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track tab changes
  const trackTabChange = useCallback((tabName: string) => {
    trackEvent('tab_change', tabName, { tab: tabName });
  }, [trackEvent]);

  // Track circuit operations
  const trackCircuitOperation = useCallback((operation: string, circuitSize: number, success: boolean = true) => {
    trackEvent('circuit_operation', 'circuit', {
      operation,
      circuitSize,
      success
    });
  }, [trackEvent]);

  // Track simulation
  const trackSimulation = useCallback((method: 'local' | 'ibm', duration: number, success: boolean = true) => {
    trackEvent('simulation', 'simulation', {
      method,
      duration,
      success
    });
  }, [trackEvent]);

  // Track tutorial progress
  const trackTutorialProgress = useCallback((tutorialId: string, progress: number, completed: boolean = false) => {
    trackEvent('tutorial_progress', 'tutorial', {
      tutorialId,
      progress,
      completed
    });
  }, [trackEvent]);

  // Track application usage
  const trackApplicationUsage = useCallback((appName: string, action: string, duration?: number) => {
    trackEvent(action, 'application', {
      appName,
      duration
    });
  }, [trackEvent]);

  // Fetch real analytics data from backend
  const fetchBackendAnalytics = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3005/analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch backend analytics", e);
      // Fallback to local calculation if backend fails
      const storedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (storedEvents.length > 0 && !analyticsData) {
        // Reuse calculateAnalyticsData logic if needed, but for now we rely on backend
      }
    }
  }, []);

  // Load stored events and initialize session
  useEffect(() => {
    const storedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setEvents(storedEvents);

    // Initialize current session
    const sessionId = getSessionId();
    const userId = getUserId();
    const newSession: UserSession = {
      id: sessionId,
      startTime: new Date(),
      duration: 0,
      actions: [],
      tabUsage: {}
    };
    setCurrentSession(newSession);

    // Track session start
    trackEvent('session_start', 'system', { sessionId });

    // Fetch initial backend data
    fetchBackendAnalytics();
  }, [getSessionId, getUserId, trackEvent, fetchBackendAnalytics]);

  // Update analytics data periodically or on events
  useEffect(() => {
    // Fetch from backend occasionally to keep fresh
    const interval = setInterval(fetchBackendAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchBackendAnalytics]);

  // Track session end on unmount
  useEffect(() => {
    return () => {
      if (currentSession) {
        const endTime = new Date();
        const duration = (endTime.getTime() - currentSession.startTime.getTime()) / 1000 / 60;
        trackEvent('session_end', 'system', {
          sessionId: currentSession.id,
          duration
        });
      }
    };
  }, [currentSession, trackEvent]);

  return {
    events,
    currentSession,
    analyticsData,
    trackEvent,
    trackTabChange,
    trackCircuitOperation,
    trackSimulation,
    trackTutorialProgress,
    trackApplicationUsage,
    refreshAnalytics: fetchBackendAnalytics
  };
};