/**
 * Gemini Service Abstraction
 *
 * Handles all Google Gemini API interactions with:
 * - Response caching
 * - Retry logic with exponential backoff
 * - Error handling
 * - Request/response logging
 *
 * @see plans/26_api_gateway_integration_strategy.md
 */

import { GoogleGenAI } from '@google/genai';

interface CachedResponse<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SkinToneResult {
  fitzpatrick_type: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  monk_scale: string;
  ita_estimate: number;
  skin_tone_confidence: number;
  reasoning: string;
}

interface FeatureExtractionResult {
  features: string[];
  description: string;
  clinical_notes: string;
}

interface RecommendationResult {
  recommendation: string;
  confidence: number;
  reasoning: string;
}

export class GeminiService {
  private client: GoogleGenAI;
  private cache = new Map<string, CachedResponse<unknown>>();
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Detect skin tone using Gemini Vision API
   */
  async detectSkinTone(imageBase64: string, mimeType: string): Promise<SkinToneResult> {
    const cacheKey = `skin-tone:${this.hashString(imageBase64.substring(0, 100))}`;

    // Check cache
    const cached = this.getFromCache<SkinToneResult>(cacheKey);
    if (cached !== null) {
      console.warn('[GeminiService] Cache hit for skin tone detection');
      return cached;
    }

    const prompt = `Analyze the skin in this image for clinical classification.
OUTPUT JSON ONLY: {
  "fitzpatrick_type": "I" | "II" | "III" | "IV" | "V" | "VI",
  "monk_scale": "string",
  "ita_estimate": number,
  "skin_tone_confidence": number (0.0-1.0),
  "reasoning": "string"
}`;

    const result = await this.retryWithBackoff(async () => {
      const response = await this.client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });

      return this.parseJSON<SkinToneResult>(response.text);
    });

    // Cache result
    this.setCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Extract features from image using Gemini Vision API
   */
  async extractFeatures(imageBase64: string, mimeType: string): Promise<FeatureExtractionResult> {
    const cacheKey = `features:${this.hashString(imageBase64.substring(0, 100))}`;

    const cached = this.getFromCache<FeatureExtractionResult>(cacheKey);
    if (cached !== null) {
      console.warn('[GeminiService] Cache hit for feature extraction');
      return cached;
    }

    const prompt = `Analyze this dermatological image and extract clinical features.
OUTPUT JSON ONLY: {
  "features": ["feature1", "feature2", ...],
  "description": "detailed description",
  "clinical_notes": "relevant clinical observations"
}`;

    const result = await this.retryWithBackoff(async () => {
      const response = await this.client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });

      return this.parseJSON<FeatureExtractionResult>(response.text);
    });

    this.setCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Generate clinical recommendations
   */
  async generateRecommendation(
    analysisData: Record<string, unknown>,
  ): Promise<RecommendationResult> {
    const cacheKey = `recommendation:${this.hashString(JSON.stringify(analysisData))}`;

    const cached = this.getFromCache<RecommendationResult>(cacheKey);
    if (cached !== null) {
      console.warn('[GeminiService] Cache hit for recommendation');
      return cached;
    }

    const prompt = `Based on this dermatological analysis, provide a clinical recommendation.
Analysis Data: ${JSON.stringify(analysisData)}

OUTPUT JSON ONLY: {
  "recommendation": "brief clinical recommendation (max 25 words)",
  "confidence": number (0.0-1.0),
  "reasoning": "clinical reasoning"
}`;

    const result = await this.retryWithBackoff(async () => {
      const response = await this.client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      return this.parseJSON<RecommendationResult>(response.text);
    });

    this.setCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Verify web content (for citations)
   */
  async verifyWebContent(
    query: string,
    context: string,
  ): Promise<{ verified: boolean; confidence: number; reasoning: string }> {
    const cacheKey = `verify:${this.hashString(query + context)}`;

    const cached = this.getFromCache<{ verified: boolean; confidence: number; reasoning: string }>(
      cacheKey,
    );
    if (cached !== null) {
      console.warn('[GeminiService] Cache hit for web verification');
      return cached;
    }

    const prompt = `Verify if this medical information is accurate and properly sourced.
Query: ${query}
Context: ${context}

OUTPUT JSON ONLY: {
  "verified": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "explanation"
}`;

    const result = await this.retryWithBackoff(async () => {
      const response = await this.client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      return this.parseJSON<{ verified: boolean; confidence: number; reasoning: string }>(
        response.text,
      );
    });

    this.setCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = this.MAX_RETRIES): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;

        if (isLastAttempt) {
          console.error('[GeminiService] Max retries exceeded', error);
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[GeminiService] Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          error,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Parse JSON response with error handling
   */
  private parseJSON<T>(text: string | undefined): T {
    if (text == null) {
      throw new Error('Empty response from Gemini API');
    }

    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanText) as T;
    } catch (error) {
      console.error('[GeminiService] Failed to parse JSON', { text, error });
      throw new Error('Invalid JSON response from Gemini API');
    }
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key) as CachedResponse<T> | undefined;

    if (cached === undefined) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Cleanup old entries if cache gets too large
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > v.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear cache (for testing/admin purposes)
   */
  clearCache(): void {
    this.cache.clear();
    console.warn('[GeminiService] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let geminiServiceInstance: GeminiService | null = null;

export const getGeminiService = (): GeminiService => {
  if (geminiServiceInstance === null) {
    const apiKey = globalThis.process?.env?.GEMINI_API_KEY;
    if (apiKey === undefined || apiKey === null) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiServiceInstance = new GeminiService(apiKey);
  }
  return geminiServiceInstance;
};
