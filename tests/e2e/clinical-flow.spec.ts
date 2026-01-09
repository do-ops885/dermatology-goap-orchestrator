import { test, expect } from '@playwright/test';

// Mock Data Generators
const mockGeminiResponse = (jsonContent: any) => {
  return {
    candidates: [{
      content: {
        parts: [{ text: JSON.stringify(jsonContent) }]
      },
      finishReason: "STOP"
    }]
  };
};

const mockGroundingResponse = (text: string, sources: any[]) => {
  return {
    candidates: [{
      content: {
        parts: [{ text }]
      },
      groundingMetadata: {
        groundingChunks: sources.map(s => ({ web: s }))
      }
    }]
  };
};

test.describe('Clinical AI Orchestrator E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Mock Gemini API to prevent real billing/quota usage and ensure deterministic reasoning
    await page.route('**/models/*:generateContent?key=*', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const promptText = requestBody.contents?.[0]?.parts?.find((p: any) => p.text)?.text || '';

      // Conditional Mocking based on Agent Prompt
      if (promptText.includes('clinical classification')) {
        // Skin Tone Agent
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({
            fitzpatrick_type: "III",
            monk_scale: "F4",
            ita_estimate: 45,
            skin_tone_confidence: 0.95,
            reasoning: "Clear visualization of epidermis"
          }))
        });
      } else if (promptText.includes('Extract skin features')) {
        // Feature Extraction Agent
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({
            bias_score: 0.05,
            disentanglement_index: 0.92,
            fairness_validated: true
          }))
        });
      } else if (promptText.includes('clinical guidelines')) {
        // Web Verification Agent
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGroundingResponse(
            "Based on recent guidelines...",
            [{ title: "DermNet NZ", uri: "https://dermnetnz.org" }]
          ))
        });
      } else {
        // Fallback generic response
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(mockGeminiResponse({ text: "Generic analysis" }))
        });
      }
    });

    await page.goto('/');
    // Wait for the "Syncing Ledger..." to finish and become "ACTIVE"
    await expect(page.locator('text=AUDIT LEDGER: ACTIVE')).toBeVisible({ timeout: 30000 });
  });

  test('Scenario A: Happy Path - High Confidence Analysis', async ({ page }) => {
    // 1. Create a dummy image file in memory
    const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    // 2. Upload Image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'skin-sample.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer
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
    await expect(page.locator('h2', { hasText: 'Diagnostic Summary' })).toBeVisible({ timeout: 20000 });
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
                body: JSON.stringify(mockGeminiResponse({
                    fitzpatrick_type: "II",
                    monk_scale: "F2",
                    ita_estimate: 20,
                    skin_tone_confidence: 0.45, // < 0.65 Threshold
                    reasoning: "Lighting is poor"
                }))
            });
        } else {
            // Default handlers for other calls
            await route.continue();
        }
    });

    // Upload and Run
    const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'low-quality.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer
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
      buffer: buffer
    });

    // Verify Error Message
    await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();
    
    // Verify Button remains disabled or reset
    await expect(page.locator('button', { hasText: 'Run Clinical Analysis' })).toBeDisabled();
  });

});