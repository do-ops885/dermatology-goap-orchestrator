/* global module */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173'],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage',
      },
    },
    assert: {
      includePassedAssertions: true,
      assertions: {
        // Performance category - warn on lower scores (AI/ML apps have heavy dependencies)
        'categories:performance': ['warn', { minScore: 0.7 }],
        // Accessibility - error if below threshold
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // Best practices - warn
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        // SEO - warn
        'categories:seo': ['warn', { minScore: 0.9 }],
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'max-potential-fid': ['warn', { maxNumericValue: 130 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // Resource budgets
        'resource-summary:script:size': ['warn', { maxNumericValue: 614400 }], // 600KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 204800 }], // 200KB
        'resource-summary:font:size': ['warn', { maxNumericValue: 102400 }], // 100KB
      },
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-results',
    },
  },
};
