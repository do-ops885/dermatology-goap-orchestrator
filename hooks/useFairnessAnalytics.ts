import { useState, useCallback } from 'react';

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

    try {
      const dbModule = await import('../services/agentDB');
      const db = dbModule.default?.getInstance?.();
      if (db == null || typeof db.getAllPatterns !== 'function') {
        setLoading(false);
        return;
      }
      const patterns = await db.getAllPatterns();

      const channel: MessageChannel =
        typeof MessageChannel !== 'undefined'
          ? new MessageChannel()
          : ({
              port1: { onmessage: null },
              port2: {},
            } as unknown as MessageChannel);

      channel.port1.onmessage = (
        event: MessageEvent<{ type: string; results: FairnessResult | null }>,
      ) => {
        if (event.data.type === 'BATCH_ANALYTICS_COMPLETE') {
          setAnalytics(event.data.results);
          setLoading(false);
        }
      };

      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type: 'RUN_BATCH_ANALYTICS', data: patterns },
          [channel.port2],
        );
      } else {
        setAnalytics(null);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const registerPeriodicSync = useCallback(async () => {
    try {
      if (navigator.serviceWorker === undefined) return;
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'periodicSync' in registration) {
        const periodicSync = (
          registration as unknown as {
            periodicSync: {
              register(_tag: string, _options: { minInterval: number }): Promise<void>;
            };
          }
        ).periodicSync;
        await periodicSync.register('fairness-analytics', {
          minInterval: 24 * 60 * 60 * 1000,
        });
      }
    } catch (e) {
      console.warn('Periodic sync not supported:', e);
    }
  }, []);

  return { analytics, loading, runBatchAnalytics, registerPeriodicSync };
}
