import { useState, useCallback } from 'react';
import AgentDB from '@/services/agentDB';

interface FairnessResult {
  I?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  II?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  III?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  IV?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  V?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  VI?: { count: number; tpr: number; fpr: number; lastUpdated: number };
  gap?: { max: number; min: number; difference: number };
}

export function useFairnessAnalytics() {
  const [analytics, setAnalytics] = useState<FairnessResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runBatchAnalytics = useCallback(async () => {
    setLoading(true);
    
    const db = AgentDB.getInstance();
    const patterns = await db.getAllPatterns();
    
    const channel = new MessageChannel();
    
    channel.port1.onmessage = (event) => {
      if (event.data.type === 'BATCH_ANALYTICS_COMPLETE') {
        setAnalytics(event.data.results);
        setLoading(false);
      }
    };
    
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(
        { type: 'RUN_BATCH_ANALYTICS', data: patterns },
        [channel.port2]
      );
    } else {
      setLoading(false);
    }
  }, []);

  const registerPeriodicSync = useCallback(async () => {
    if ('periodicSync' in navigator.serviceWorker.registration) {
      try {
        await navigator.serviceWorker.registration.periodicSync.register('fairness-analytics', {
          minInterval: 24 * 60 * 60 * 1000
        });
      } catch (e) {
        console.warn('Periodic sync not supported:', e);
      }
    }
  }, []);

  return { analytics, loading, runBatchAnalytics, registerPeriodicSync };
}
