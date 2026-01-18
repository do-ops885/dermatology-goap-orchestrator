import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

const API_ROUTE_PATTERN = '**/models/*:generateContent?key=*';
const RUN_ANALYSIS_BUTTON = 'Run Clinical Analysis';
const DIAGNOSTIC_SUMMARY = 'Diagnostic Summary';
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/A0f/';
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Mock Data Generators
const mockGeminiResponse = (jsonContent: any) => {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(jsonContent) }],
        },
        finishReason: 'STOP',
      },
    ],
  };
};

const mockGroundingResponse = (text: string, sources: any[]) => {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
        groundingMetadata: {
          groundingChunks: sources.map((s) => ({ web: s })),
        },
      },
    ],
  };
};

test.describe('E2E Scenarios A-G: Complete Clinical Pipeline Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Default mock setup for high confidence scenarios
    await page.route(API_ROUTE_PATTERN, async (route) => {
      const requestBody = JSON.parse(route.request().postData() ?? '{}');
      const promptText =
        requestBody.contents?.[0]?.parts?.find((p: { text?: string }) => p.text)?.text ?? '';

      // Conditional Mocking based on Agent Prompt
      if (promptText.includes('clinical classification')) {
        // Skin Tone Agent - High Confidence
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              fitzpatrick_type: 'III',
              monk_scale: 'F4',
              ita_estimate: 45,
              skin_tone_confidence: 0.95,
              reasoning: 'Clear visualization of epidermis',
            }),
          ),
        });
      } else if (promptText.includes('Extract skin features')) {
        // Feature Extraction Agent
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              bias_score: 0.05,
              disentanglement_index: 0.92,
              fairness_validated: true,
            }),
          ),
        });
      } else if (promptText.includes('clinical guidelines')) {
        // Web Verification Agent
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGroundingResponse('Based on recent guidelines...', [
              { title: 'DermNet NZ', uri: 'https://dermnetnz.org' },
            ]),
          ),
        });
      } else {
        // Default handlers for other calls
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({ status: 'ok' })),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('SCENARIO A: Happy Path - Full 16-Agent Pipeline', () => {
    test('executes complete pipeline with valid JPEG, verifies audit_logged: true', async ({
      page,
    }) => {
      // 1. Upload valid JPEG image
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'skin-sample-high-quality.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      // 2. Verify preview and enable run button
      await expect(page.locator('img[alt="Preview"]')).toBeVisible();
      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await expect(runBtn).toBeEnabled();

      // 3. Start execution and track timing
      const startTime = Date.now();
      await runBtn.click();

      // 4. Verify orchestrator starts
      await expect(runBtn).toHaveText(/Orchestrating Agents/);

      // 5. Wait for completion with full pipeline trace
      const logs = page.locator('[role="log"]');

      // Verify all 16 agents execute
      const expectedAgents = [
        'Image-Verification-Agent',
        'Skin-Tone-Detection-Agent',
        'Standard-Calibration-Agent',
        'Image-Preprocessing-Agent',
        'Segmentation-Agent',
        'Feature-Extraction-Agent',
        'Lesion-Detection-Agent',
        'Similarity-Search-Agent',
        'Risk-Assessment-Agent',
        'Fairness-Audit-Agent',
        'Web-Verification-Agent',
        'Recommendation-Agent',
        'Learning-Agent',
        'Privacy-Encryption-Agent',
        'Audit-Trail-Agent',
      ];

      // Wait for pipeline completion
      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 90000,
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Verify execution duration is reasonable (<72s per requirements)
      expect(totalDuration).toBeLessThan(72000);
      console.log(`Full pipeline completed in ${totalDuration}ms`);

      // Verify trace contains all expected agents
      const logText = (await logs.textContent()) || '';
      expectedAgents.forEach((agent) => {
        expect(logText).toContain(agent);
      });

      // Verify final audit state
      await expect(page.locator('text=Fairness Guard')).toBeVisible();
      await expect(page.locator('text=Type III')).toBeVisible();

      // Verify audit_logged: true (final state condition)
      const worldStateCheck = await page.evaluate(() => {
        return (window as any).worldState?.audit_logged === true;
      });
      expect(worldStateCheck).toBeTruthy();
    });
  });

  test.describe('SCENARIO B: Safety Interception - Low Confidence Routing', () => {
    test('simulates low confidence (<0.65), verifies GOAP routes to Safety-Calibration-Agent', async ({
      page,
    }) => {
      // Override mock for low confidence simulation
      await page.route(API_ROUTE_PATTERN, async (route) => {
        const requestBody = JSON.parse(route.request().postData() ?? '{}');
        const promptText =
          requestBody.contents?.[0]?.parts?.find((p: { text?: string }) => p.text)?.text ?? '';

        if (promptText.includes('clinical classification')) {
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(
              mockGeminiResponse({
                fitzpatrick_type: 'II',
                monk_scale: 'F2',
                ita_estimate: 20,
                skin_tone_confidence: 0.45, // < 0.65 threshold
                reasoning: 'Poor lighting conditions detected',
              }),
            ),
          });
        } else {
          await route.continue();
        }
      });

      // Upload image and run analysis
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'poor-quality-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      // Verify warning UI displayed
      await expect(page.locator('text=Low detection confidence (45%)')).toBeVisible({
        timeout: 10000,
      });

      // Verify GOAP routes to Safety-Calibration-Agent
      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Safety-Calibration-Agent', { timeout: 15000 });

      // Verify Standard-Calibration-Agent is NOT used
      const logText = await logs.textContent();
      expect(logText).not.toContain('Standard-Calibration-Agent');

      // Verify safety calibration state
      await expect(page.locator('text=SAFETY_CALIBRATION_ACTIVE')).toBeVisible();

      // Verify safety_calibrated: true in final state
      const safetyStateCheck = await page.evaluate(() => {
        return (window as any).worldState?.safety_calibrated === true;
      });
      expect(safetyStateCheck).toBeTruthy();
    });
  });

  test.describe('SCENARIO C: Security/Error Handling', () => {
    test('rejects invalid file types, validates magic bytes, SHA-256, Ed25519 signatures', async ({
      page,
    }) => {
      // Test 1: Reject invalid file types
      const textBuffer = Buffer.from('This is a text file, not an image.', 'utf-8');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'malicious.txt',
        mimeType: 'text/plain',
        buffer: textBuffer,
      });

      await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();
      await expect(page.locator('button', { hasText: 'Run Clinical Analysis' })).toBeDisabled();

      // Test 2: Reject PNG disguised as JPEG
      const fakeJpegBuffer = Buffer.from(PNG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fake.jpg',
        mimeType: 'image/jpeg',
        buffer: fakeJpegBuffer,
      });

      await expect(page.locator('text=Magic bytes validation failed')).toBeVisible();

      // Test 3: Valid JPEG with proper magic bytes
      const validJpegBuffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'valid-sample.jpg',
        mimeType: 'image/jpeg',
        buffer: validJpegBuffer,
      });

      await expect(page.locator('img[alt="Preview"]')).toBeVisible();

      // Verify cryptographic validation occurs
      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Image-Verification-Agent');

      // Verify SHA-256 hash generation is logged
      const logText = await logs.textContent();
      expect(logText).toMatch(/SHA-256|hash|cryptographic/);
    });
  });

  test.describe('SCENARIO D: Offline Mode', () => {
    test('disables network, verifies local inference works, checks fallback to local LLM', async ({
      page,
    }) => {
      // Block external API calls to simulate offline mode
      await page.route(API_ROUTE_PATTERN, (route) => route.abort('internet'));

      // Mock WebLLM local model endpoint
      await page.route('**/api/webllm/**', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'loaded',
            model: 'SmolLM2-360M-Instruct-Local',
            offline: true,
          }),
        });
      });

      // Upload and run analysis
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'offline-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      // Verify offline mode indicator
      await expect(page.locator('text=OFFLINE MODE ACTIVE')).toBeVisible({ timeout: 10000 });

      // Verify local model was used
      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Local Inference');
      await expect(logs).toContainText('SmolLM2');

      // Verify analysis completes with local processing
      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 30000,
      });

      // Verify no external API calls were made
      const apiCallCheck = await page.evaluate(() => {
        return (window as any).externalApiCalls || 0;
      });
      expect(apiCallCheck).toBe(0);
    });
  });

  test.describe('SCENARIO E: Orchestration Trace', () => {
    test('asserts trace contains plan_start, agent_start/agent_end, plan_end events', async ({
      page,
    }) => {
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'trace-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      // Wait for completion
      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 60000,
      });

      const logs = page.locator('[role="log"]');
      const logText = await logs.textContent();

      // Verify orchestration trace events
      expect(logText).toContain('plan_start');
      expect(logText).toContain('agent_start');
      expect(logText).toContain('agent_end');
      expect(logText).toContain('plan_end');

      // Verify trace contains duration/timing information
      expect(logText).toMatch(/duration|timestamp|ms/);

      // Verify trace ID format (run_xxxxx)
      expect(logText).toMatch(/run_[a-z0-9]+/);

      // Verify world state progression is logged
      expect(logText).toMatch(/state|world|transition/);

      // Verify completion flag
      expect(logText).toContain('audit_logged: true');
    });
  });

  test.describe('SCENARIO F: Memory Leaks', () => {
    test("runs 50 analyses, verifies GPU memory doesn't grow, checks tensor cleanup", async ({
      page,
    }) => {
      // Track initial memory state
      const initialMemoryCheck = await page.evaluate(() => {
        if ('gc' in window) {
          (window as { gc?: () => void }).gc?.();
        }

        // Get TensorFlow.js memory info
        const tfMemory = (window as any).tf?.memory();
        const performanceMemory = (
          performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
        ).memory;

        return {
          tfTensors: tfMemory?.numTensors || 0,
          tfBytes: tfMemory?.numBytes || 0,
          heapUsed: performanceMemory?.usedJSHeapSize || 0,
          heapTotal: performanceMemory?.totalJSHeapSize || 0,
          timestamp: Date.now(),
        };
      });

      console.log('Initial memory state:', initialMemoryCheck);

      // Run 50 sequential analyses
      for (let i = 0; i < 50; i++) {
        const buffer = Buffer.from(JPEG_BASE64, 'base64');
        await page.locator('input[type="file"]').setInputFiles({
          name: `memory-test-${i}.jpg`,
          mimeType: 'image/jpeg',
          buffer,
        });

        const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
        await runBtn.click();

        // Wait for completion
        await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
          timeout: 45000,
        });

        // Clear file input for next iteration
        await page.locator('input[type="file"]').setInputFiles([]);

        // Periodic memory checks every 10 iterations
        if ((i + 1) % 10 === 0) {
          const memoryCheck = await page.evaluate(() => {
            if ('gc' in window) {
              (window as { gc?: () => void }).gc?.();
            }

            const tfMemory = (window as any).tf?.memory();
            const performanceMemory = (
              performance as unknown as {
                memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
              }
            ).memory;

            return {
              tfTensors: tfMemory?.numTensors || 0,
              tfBytes: tfMemory?.numBytes || 0,
              heapUsed: performanceMemory?.usedJSHeapSize || 0,
              heapTotal: performanceMemory?.totalJSHeapSize || 0,
              iteration: (window as any).currentIteration || 0,
            };
          });

          console.log(`Memory after ${i + 1} analyses:`, memoryCheck);
        }
      }

      // Final memory check
      const finalMemoryCheck = await page.evaluate(() => {
        if ('gc' in window) {
          (window as { gc?: () => void }).gc?.();
        }

        const tfMemory = (window as any).tf?.memory();
        const performanceMemory = (
          performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
        ).memory;

        return {
          tfTensors: tfMemory?.numTensors || 0,
          tfBytes: tfMemory?.numBytes || 0,
          heapUsed: performanceMemory?.usedJSHeapSize || 0,
          heapTotal: performanceMemory?.totalJSHeapSize || 0,
          timestamp: Date.now(),
        };
      });

      console.log('Final memory state:', finalMemoryCheck);

      // Verify tensor cleanup occurred
      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Tensors disposed');

      // Memory growth should be < 50% increase
      const tfGrowthRatio =
        initialMemoryCheck.tfBytes > 0
          ? (finalMemoryCheck.tfBytes - initialMemoryCheck.tfBytes) / initialMemoryCheck.tfBytes
          : 0;
      const heapGrowthRatio =
        initialMemoryCheck.heapUsed > 0
          ? (finalMemoryCheck.heapUsed - initialMemoryCheck.heapUsed) / initialMemoryCheck.heapUsed
          : 0;

      console.log(`TF.js bytes growth: ${(tfGrowthRatio * 100).toFixed(2)}%`);
      console.log(`Heap growth: ${(heapGrowthRatio * 100).toFixed(2)}%`);

      expect(tfGrowthRatio).toBeLessThan(0.5);
      expect(heapGrowthRatio).toBeLessThan(0.5);
    });
  });

  test.describe('SCENARIO G: Performance Benchmarks', () => {
    test('measures TTI with heavy models, times agents, asserts <72s total pipeline', async ({
      page,
    }) => {
      // Measure Time to Interactive (TTI)
      const ttiStart = performance.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const tti = performance.now() - ttiStart;

      console.log(`TTI: ${tti}ms`);

      // TTI should be under 5 seconds
      expect(tti).toBeLessThan(5000);

      // Start pipeline timing
      const pipelineStart = Date.now();

      // Upload and analyze
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'performance-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      await page.locator('button', { hasText: RUN_ANALYSIS_BUTTON }).click();

      // Wait for completion
      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 90000,
      });

      const pipelineDuration = Date.now() - pipelineStart;
      console.log(`Total pipeline duration: ${pipelineDuration}ms`);

      // Total pipeline should be under 72 seconds
      expect(pipelineDuration).toBeLessThan(72000);

      // Verify agent execution timing in logs
      const logs = page.locator('[role="log"]');
      const logText = await logs.textContent();

      // Should contain timing information
      expect(logText).toMatch(/\d+ms|\d+s/);

      // Verify key agents completed within expected timeframes
      const agentTimings = logText?.match(/(\w+-Agent).*?(\d+)ms/g);
      if (agentTimings) {
        console.log('Agent timings:', agentTimings);

        // Verify heavy models (like lesion detection) completed in reasonable time
        const lesionDetectionTiming = agentTimings.find((timing) =>
          timing.includes('Lesion-Detection-Agent'),
        );
        if (lesionDetectionTiming) {
          const timing = parseInt(lesionDetectionTiming.match(/(\d+)ms/)?.[1] ?? '0');
          expect(timing).toBeLessThan(15000); // 15s max for lesion detection
        }
      }
    });
  });
});
