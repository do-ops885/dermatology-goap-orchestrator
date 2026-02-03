/**
 * Gemini API Routes
 *
 * Handles all Gemini API requests from the frontend
 */

import { Hono } from 'hono';
import { getGeminiService } from '../services/geminiService';

const gemini = new Hono();

/**
 * POST /api/gemini/skin-tone
 * Detect skin tone from image
 */
gemini.post('/skin-tone', async (c) => {
  try {
    const body = await c.req.json<{
      imageBase64: string;
      mimeType: string;
    }>();

    if (!body.imageBase64 || !body.mimeType) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: imageBase64, mimeType',
        },
        400,
      );
    }

    const service = getGeminiService();
    const result = await service.detectSkinTone(body.imageBase64, body.mimeType);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Gemini API] Skin tone detection failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Skin tone detection failed',
      },
      500,
    );
  }
});

/**
 * POST /api/gemini/extract-features
 * Extract features from image
 */
gemini.post('/extract-features', async (c) => {
  try {
    const body = await c.req.json<{
      imageBase64: string;
      mimeType: string;
    }>();

    if (!body.imageBase64 || !body.mimeType) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: imageBase64, mimeType',
        },
        400,
      );
    }

    const service = getGeminiService();
    const result = await service.extractFeatures(body.imageBase64, body.mimeType);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Gemini API] Feature extraction failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Feature extraction failed',
      },
      500,
    );
  }
});

/**
 * POST /api/gemini/recommendation
 * Generate clinical recommendation
 */
gemini.post('/recommendation', async (c) => {
  try {
    const body = await c.req.json<{
      analysisData: Record<string, unknown>;
    }>();

    if (!body.analysisData) {
      return c.json(
        {
          success: false,
          error: 'Missing required field: analysisData',
        },
        400,
      );
    }

    const service = getGeminiService();
    const result = await service.generateRecommendation(body.analysisData);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Gemini API] Recommendation generation failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Recommendation generation failed',
      },
      500,
    );
  }
});

/**
 * POST /api/gemini/verify
 * Verify web content
 */
gemini.post('/verify', async (c) => {
  try {
    const body = await c.req.json<{
      query: string;
      context: string;
    }>();

    if (!body.query || !body.context) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: query, context',
        },
        400,
      );
    }

    const service = getGeminiService();
    const result = await service.verifyWebContent(body.query, body.context);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Gemini API] Web verification failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Web verification failed',
      },
      500,
    );
  }
});

/**
 * GET /api/gemini/cache-stats
 * Get cache statistics (admin/debug)
 */
gemini.get('/cache-stats', (c) => {
  try {
    const service = getGeminiService();
    const stats = service.getCacheStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Gemini API] Cache stats failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cache stats',
      },
      500,
    );
  }
});

/**
 * POST /api/gemini/cache-clear
 * Clear cache (admin only)
 */
gemini.post('/cache-clear', (c) => {
  try {
    const service = getGeminiService();
    service.clearCache();

    return c.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('[Gemini API] Cache clear failed', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
      },
      500,
    );
  }
});

export default gemini;
