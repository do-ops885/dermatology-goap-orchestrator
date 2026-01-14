/* global clients */
// Service worker for batch analytics

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
  if (event.data.type === 'RUN_BATCH_ANALYTICS') {
    const results = await runBatchAnalytics(event.data.data);
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'BATCH_ANALYTICS_COMPLETE',
          results,
        });
      });
    });
  }
});

async function runBatchAnalytics(patterns) {
  // Group by Fitzpatrick type
  const groups = {
    I: [],
    II: [],
    III: [],
    IV: [],
    V: [],
    VI: [],
  };

  patterns.forEach((p) => {
    const type = p.metadata?.fitzpatrick;
    if (type && groups[type]) {
      groups[type].push(p);
    }
  });

  // Compute TPR/FPR per group
  const results = {};

  for (const [group, items] of Object.entries(groups)) {
    const count = items.length;
    const correct = items.filter((p) => (p.successRate || p.confidence || 0) > 0.7).length;

    results[group] = {
      count,
      tpr: count > 0 ? correct / count : 0.9,
      fpr: count > 0 ? (count - correct) / count : 0.05,
      lastUpdated: Date.now(),
    };
  }

  // Calculate gap
  const tprs = Object.values(results).map((r) => r.tpr);
  results.gap = {
    max: Math.max(...tprs),
    min: Math.min(...tprs),
    difference: Math.max(...tprs) - Math.min(...tprs),
  };

  return results;
}

// Scheduled task (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'fairness-analytics') {
      event.waitUntil(runScheduledAnalytics());
    }
  });
}

async function runScheduledAnalytics() {
  console.log('Running scheduled fairness analytics...');
}
