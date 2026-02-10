module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        maxWaitForLoad: 180000,
        maxWaitForFcp: 120000,
        // Simplified chromeFlags for CI headless Chrome - removed --disable-web-security, added --disable-setuid-sandbox
        chromeFlags:
          '--no-sandbox --disable-setuid-sandbox --headless --disable-gpu --disable-dev-shm-usage',
        // Extended wait times for React SPA hydration and ML model loading
        pauseAfterFcpMs: 25000,
        pauseAfterLoadMs: 30000,
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
