/**
 * Web Vitals Measurement Script
 * 
 * Run this in the browser console to measure Web Vitals
 * 
 * Usage:
 * 1. Open your app: http://localhost:5173
 * 2. Open DevTools console (F12)
 * 3. Copy/paste this script
 * 4. Interact with the app
 * 5. Check console for metrics
 */

(function() {
    console.log('🎯 Web Vitals Measurement Started');
    console.log('Interact with the app to collect metrics...\n');

    const metrics = {};
    const thresholds = {
        CLS: { good: 0.1, needsImprovement: 0.25 },
        FID: { good: 100, needsImprovement: 300 },
        FCP: { good: 1800, needsImprovement: 3000 },
        LCP: { good: 2500, needsImprovement: 4000 },
        TTFB: { good: 800, needsImprovement: 1800 },
        INP: { good: 200, needsImprovement: 500 },
    };

    function getRating(metricName, value) {
        const threshold = thresholds[metricName];
        if (!threshold) return 'unknown';
        
        if (value <= threshold.good) return 'good';
        if (value <= threshold.needsImprovement) return 'needs-improvement';
        return 'poor';
    }

    function formatMetric(metric) {
        const rating = getRating(metric.name, metric.value);
        const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
        
        return `${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${rating})`;
    }

    function logMetric(metric) {
        metrics[metric.name] = metric;
        console.log(formatMetric(metric));
    }

    // Try to use web-vitals library if loaded
    if (typeof webVitals !== 'undefined') {
        console.log('Using web-vitals library\n');
        
        webVitals.onCLS(logMetric);
        webVitals.onFID(logMetric);
        webVitals.onFCP(logMetric);
        webVitals.onLCP(logMetric);
        webVitals.onTTFB(logMetric);
        
        try {
            webVitals.onINP(logMetric);
        } catch (e) {
            console.warn('INP not available');
        }
    } else {
        console.log('web-vitals library not found, using PerformanceObserver\n');
        
        // Fallback to PerformanceObserver
        if ('PerformanceObserver' in window) {
            // LCP
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    logMetric({ name: 'LCP', value: lastEntry.renderTime || lastEntry.loadTime });
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {}

            // FID
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        logMetric({ name: 'FID', value: entry.processingStart - entry.startTime });
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {}

            // CLS
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            logMetric({ name: 'CLS', value: clsValue });
                        }
                    }
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {}

            // Navigation timing
            window.addEventListener('load', () => {
                const navTiming = performance.getEntriesByType('navigation')[0];
                if (navTiming) {
                    logMetric({ name: 'FCP', value: navTiming.responseStart });
                    logMetric({ name: 'TTFB', value: navTiming.responseStart - navTiming.requestStart });
                }
            });
        }
    }

    // Custom metrics
    const customMetrics = [];

    function trackCustom(name, value) {
        customMetrics.push({ name, value, timestamp: Date.now() });
        console.log(`📊 Custom: ${name} = ${value}ms`);
    }

    // Expose global functions
    window.webVitalsMeasurement = {
        getMetrics: () => metrics,
        getCustomMetrics: () => customMetrics,
        trackCustom,
        exportReport: () => {
            console.log('\n📈 Web Vitals Report');
            console.log('===================');
            Object.values(metrics).forEach(metric => {
                console.log(formatMetric(metric));
            });
            
            if (customMetrics.length > 0) {
                console.log('\n📊 Custom Metrics');
                console.log('=================');
                customMetrics.forEach(m => {
                    console.log(`${m.name}: ${m.value}ms`);
                });
            }
            
            // Summary
            const ratings = Object.values(metrics).map(m => getRating(m.name, m.value));
            const good = ratings.filter(r => r === 'good').length;
            const needsImprovement = ratings.filter(r => r === 'needs-improvement').length;
            const poor = ratings.filter(r => r === 'poor').length;
            
            console.log('\n📋 Summary');
            console.log('==========');
            console.log(`✅ Good: ${good}`);
            console.log(`⚠️ Needs Improvement: ${needsImprovement}`);
            console.log(`❌ Poor: ${poor}`);
            
            return {
                metrics,
                customMetrics,
                summary: { good, needsImprovement, poor }
            };
        }
    };

    // Auto-export after 10 seconds
    setTimeout(() => {
        console.log('\n⏰ 10 seconds elapsed, exporting report...\n');
        window.webVitalsMeasurement.exportReport();
    }, 10000);

    console.log('\n💡 Use window.webVitalsMeasurement.exportReport() to see full report');
    console.log('💡 Use window.webVitalsMeasurement.trackCustom(name, value) for custom metrics\n');
})();
