module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        maxWaitForLoad: 180000,
        maxWaitForFcp: 120000,
        chromeFlags:
          '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage --disable-features=IsolateOrigins,site-per-process,TranslateUI --disable-site-isolation-trials --disable-web-security --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows',
        // Wait longer for React SPA to hydrate - increased for ML model loading
        pauseAfterFcpMs: 15000,
        pauseAfterLoadMs: 20000,
        // Wait for React to render content
        waitFor: '#root',
        // Ensure we wait for the page to be fully interactive
        waitForLoad: true,
        // Add extra wait for network idle
        extraHeaders: {
          'Accept-CH': 'Sec-CH-UA-Platform-Version',
        },
        // Skip certain audits that may fail in CI
        skipAudits: ['full-page-screenshot'],
      },
    },
    assert: {
      includePassedAssertions: true,
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'max-potential-fid': ['warn', { maxNumericValue: 130 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 614400 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 204800 }],
        'resource-summary:font:size': ['warn', { maxNumericValue: 102400 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-results',
    },
  },
};
