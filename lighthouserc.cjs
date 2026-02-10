module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      // Single run for CI speed - multiple runs cause timeouts
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        // Reduced wait times for CI environment
        maxWaitForLoad: 60000,
        maxWaitForFcp: 45000,
        // Optimized Chrome flags for headless CI
        chromeFlags: [
          '--no-sandbox',
          '--headless=new',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
          '--disable-site-isolation-trials',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--memory-pressure-off',
          '--max-old-space-size=4096',
        ].join(' '),
        // Shorter pauses for CI - app should be ready after preview wait
        pauseAfterFcpMs: 5000,
        pauseAfterLoadMs: 8000,
        // Wait for React root element
        waitFor: '#root',
        // Skip heavy audits in CI
        skipAudits: ['full-page-screenshot', 'screenshot-thumbnails', 'final-screenshot'],
        // Disable CPU throttling for consistent CI results
        throttlingMethod: 'provided',
        // Extra headers for CI environment
        extraHeaders: {
          'Accept-CH': 'Sec-CH-UA-Platform-Version',
        },
      },
    },
    assert: {
      includePassedAssertions: true,
      assertions: {
        // Relaxed thresholds for CI (ML-heavy app with TensorFlow.js)
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.7 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        // Relaxed timing budgets for ML app
        'largest-contentful-paint': ['warn', { maxNumericValue: 5000 }],
        'max-potential-fid': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.2 }],
        // Resource budgets
        'resource-summary:script:size': ['warn', { maxNumericValue: 1048576 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 524288 }],
        'resource-summary:font:size': ['warn', { maxNumericValue: 204800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-results',
    },
  },
};
