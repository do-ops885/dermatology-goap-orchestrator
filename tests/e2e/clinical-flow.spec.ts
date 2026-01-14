import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

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

test.describe('Clinical AI Orchestrator E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Gemini API to prevent real billing/quota usage and ensure deterministic reasoning
    await page.route('**/models/*:generateContent?key=*', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const promptText = requestBody.contents?.[0]?.parts?.find((p: any) => p.text)?.text || '';

      // Conditional Mocking based on Agent Prompt
      if (promptText.includes('clinical classification')) {
        // Skin Tone Agent
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
        // Fallback generic response
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({ text: 'Generic analysis' })),
        });
      }
    });

    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('Scenario A: Happy Path - High Confidence Analysis', async ({ page }) => {
    // 1. Create a dummy image file in memory
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    // 2. Upload Image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'skin-sample.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    // 3. Verify Preview and Run
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
    const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // 4. Verify Orchestration State
    await expect(runBtn).toHaveText(/Orchestrating Agents/);

    // 5. Check Agent Trace in the Log
    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Image-Verification-Agent');
    await expect(logs).toContainText('Skin-Tone-Detection-Agent');

    // Because we mocked 0.95 confidence, we expect Standard Calibration
    await expect(logs).toContainText('Standard-Calibration-Agent');

    // 6. Verify Results
    await expect(page.locator('h2', { hasText: 'Diagnostic Summary' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('text=Type III')).toBeVisible();
    await expect(page.locator('text=Fairness Guard')).toBeVisible();
  });

  test('Scenario B: Safety Interception - Low Confidence Trigger', async ({ page }) => {
    // Override the specific mock for Low Confidence simulation
    await page.route('**/models/*:generateContent?key=*', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const promptText = requestBody.contents?.[0]?.parts?.find((p: any) => p.text)?.text || '';

      if (promptText.includes('clinical classification')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              fitzpatrick_type: 'II',
              monk_scale: 'F2',
              ita_estimate: 20,
              skin_tone_confidence: 0.45, // < 0.65 Threshold
              reasoning: 'Lighting is poor',
            }),
          ),
        });
      } else {
        // Default handlers for other calls
        await route.continue();
      }
    });

    // Upload and Run
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: 'low-quality.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });
    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();

    // Verify Warning UI
    await expect(page.locator('text=Low detection confidence (45%)')).toBeVisible();

    // Verify GOAP Re-planning execution
    // The Planner should inject Safety-Calibration-Agent instead of Standard
    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Safety-Calibration-Agent', { timeout: 15000 });

    // Verify Safety Indicator in State View
    await expect(page.locator('text=SAFETY_CALIBRATION_ACTIVE')).toBeVisible();
  });

  test('Scenario C: Security & Error Handling - Invalid File', async ({ page }) => {
    // Attempt to upload a text file disguised as an image
    const buffer = Buffer.from('This is a text file, not an image.', 'utf-8');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'malicious.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    // Verify Error Message
    await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();

    // Verify Button remains disabled or reset
    await expect(page.locator('button', { hasText: 'Run Clinical Analysis' })).toBeDisabled();
  });

  test('Scenario D: Offline Mode - Local Inference Fallback', async ({ page }) => {
    // Intercept and block external API calls to simulate offline mode
    await page.route('**/models/*:generateContent?key=*', (route) => route.abort('internet'));

    // Set up local WebLLM mock for offline inference
    await page.route('**/api/webllm/**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'loaded',
          model: 'SmolLM2-360M-Instruct-Local',
        }),
      });
    });

    // Upload and Run
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-sample.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });
    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();

    // Verify offline mode indicator
    await expect(page.locator('text=OFFLINE MODE ACTIVE')).toBeVisible({ timeout: 10000 });

    // Verify local model was used
    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Local Inference');
    await expect(logs).toContainText('SmolLM2');

    // Verify analysis still completes successfully
    await expect(page.locator('h2', { hasText: 'Diagnostic Summary' })).toBeVisible({
      timeout: 30000,
    });
  });

  test('Scenario E: Memory Leak Prevention - Sequential Analyses', async ({ page }) => {
    // Track initial memory state if available
    const initialMemoryCheck = await page.evaluate(() => {
      if ('gc' in window) {
        (window as { gc?: () => void }).gc?.();
      }
      const memory = (
        performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
      ).memory;
      return {
        heapUsed: memory?.usedJSHeapSize ?? 0,
        heapLimit: memory?.totalJSHeapSize ?? 0,
      };
    });

    // Run 10 sequential analyses
    for (let i = 0; i < 10; i++) {
      const buffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );
      await page.locator('input[type="file"]').setInputFiles({
        name: `sample-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: buffer,
      });

      const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
      await runBtn.click();

      // Wait for each analysis to complete
      await expect(page.locator('text=Diagnostic Summary')).toBeVisible({ timeout: 30000 });

      // Clear file input for next iteration
      await page.locator('input[type="file"]').setInputFiles([]);
    }

    // Check for tensor cleanup logs
    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Tensors disposed');

    // Memory check after 10 analyses
    const finalMemoryCheck = await page.evaluate(() => {
      if ('gc' in window) {
        (window as { gc?: () => void }).gc?.();
      }
      const memory = (
        performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
      ).memory;
      return {
        heapUsed: memory?.usedJSHeapSize ?? 0,
        heapLimit: memory?.totalJSHeapSize ?? 0,
      };
    });

    // Memory should not have grown significantly (> 50% increase indicates leak)
    const memoryGrowth = finalMemoryCheck.heapUsed - initialMemoryCheck.heapUsed;
    const growthRatio =
      initialMemoryCheck.heapUsed > 0 ? memoryGrowth / initialMemoryCheck.heapUsed : 0;

    expect(growthRatio).toBeLessThan(0.5);
  });

  test('Scenario E: GOAP Orchestration Trace & Agent Execution', async ({ page }) => {
    await page.goto('/');

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-lesion.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/A0f/',
        'base64',
      ),
    });

    // Start analysis
    const analyzeButton = page.locator('button:has-text("Analyze")');
    await analyzeButton.click();

    // Wait for completion
    await page.waitForSelector('[data-testid="analysis-result"], text=/Analysis Complete/i', {
      timeout: 60000,
    });

    // Verify orchestration trace exists in the page state
    await page.evaluate(() => {
      // Access React component state (if exposed via window for debugging)
      const traceElement = document.querySelector('[data-trace-id]');
      return {
        hasTrace: !!traceElement,
        traceId: traceElement?.getAttribute('data-trace-id'),
      };
    });

    // Check agent logs for GOAP-Agent orchestration messages
    const logs = page.locator('[data-testid="agent-log-entry"]');
    const logCount = await logs.count();
    expect(logCount).toBeGreaterThan(0);

    // Verify key agents executed
    const imageVerificationLog = page.locator('text=/Image-Verification-Agent/i').first();
    await expect(imageVerificationLog).toBeVisible();

    const skinToneLog = page.locator('text=/Skin-Tone-Detection-Agent/i').first();
    await expect(skinToneLog).toBeVisible();

    const goapLog = page.locator('text=/GOAP-Agent/i, text=/Plan.*completed/i');
    await expect(goapLog).toBeVisible({ timeout: 5000 });

    // Verify orchestrator logged completion with trace ID
    const goapLogText = await goapLog.textContent();
    expect(goapLogText).toMatch(/run_[a-z0-9]+/); // Trace ID format: run_xxxxx
  });

  test('Scenario E: Orchestration Trace & Replan', async ({ page }) => {
    // This test verifies that the GOAP agent produces proper traces and can replan

    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'skin-sample-trace.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
    await runBtn.click();

    // Wait for analysis to complete
    await page.waitForSelector(
      '[data-testid="analysis-result"], text=/Analysis Complete/i, text=/Diagnostic Summary/i',
      {
        timeout: 60000,
      },
    );

    // Verify orchestration trace is present in logs or UI
    const traceElement = page
      .locator('[data-testid="agent-trace"], [data-testid="agent-flow"]')
      .first();
    await expect(traceElement).toBeVisible({ timeout: 5000 });

    // Check for trace schema elements
    // A proper trace should include: runId, agents array, finalWorldState, timestamps
    const agentFlowContent = await traceElement.textContent();

    // Verify key agents are shown in the trace
    expect(agentFlowContent).toMatch(/Image-Verification|Skin-Tone-Detection|Calibration/i);

    // Verify trace includes timing information (agents should show as completed)
    const completedAgents = page.locator(
      '[data-status="completed"], .agent-completed, text=/completed/i',
    );
    const completedCount = await completedAgents.count();
    expect(completedCount).toBeGreaterThan(0);

    // Verify trace ID format (should be run_xxxxx)
    const traceIdElement = page.locator('text=/run_[a-z0-9]+/i').first();
    await expect(traceIdElement).toBeVisible({ timeout: 5000 });

    // Verify world state progression is logged
    const stateTransitions = page.locator('text=/state|world|transition/i');
    const stateCount = await stateTransitions.count();
    expect(stateCount).toBeGreaterThan(0);

    // Check that finalWorldState has required completion flags
    // This would be in logs or debug output
    const auditLoggedIndicator = page.locator('text=/audit_logged|audit.*true|encrypted/i').first();
    await expect(auditLoggedIndicator).toBeVisible({ timeout: 5000 });
  });

  test('Scenario F: Safety Calibration Routing on Low Confidence', async ({ page }) => {
    // Override mock to return low confidence
    await page.route('**/models/*:generateContent?key=*', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const promptText = requestBody.contents?.[0]?.parts?.find((p: any) => p.text)?.text || '';

      if (promptText.includes('clinical classification')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              fitzpatrick_type: 'IV',
              monk_scale: 'F5',
              ita_estimate: 30,
              skin_tone_confidence: 0.45, // LOW CONFIDENCE
              reasoning: 'Poor lighting conditions',
            }),
          ),
        });
      } else {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({ status: 'ok' })),
        });
      }
    });

    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-lesion-low-confidence.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/A0f/',
        'base64',
      ),
    });

    const analyzeButton = page.locator('button:has-text("Analyze")');
    await analyzeButton.click();

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-result"], text=/Analysis Complete/i', {
      timeout: 60000,
    });

    // Verify Safety-Calibration-Agent was invoked (not Standard-Calibration-Agent)
    const safetyCalibrationLog = page.locator('text=/Safety-Calibration-Agent/i').first();
    await expect(safetyCalibrationLog).toBeVisible();

    // Ensure conservative thresholds were mentioned in logs or warnings
    const warningText = page.locator('text=/conservative|safety|low confidence/i').first();
    await expect(warningText).toBeVisible({ timeout: 5000 });
  });
});
