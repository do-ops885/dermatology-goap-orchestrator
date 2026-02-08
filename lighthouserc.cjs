module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        maxWaitForLoad: 120000,
        chromeFlags: '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage',
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
