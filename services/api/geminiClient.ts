/**
 * Gemini API Client (Frontend)
 *
 * Replaces direct Gemini API calls with backend API gateway calls.
 * This ensures API keys are never exposed in client.
 *
 * @see plans/26_api_gateway_integration_strategy.md
 */

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const importMeta: ImportMeta;

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

interface VerificationResult {
  verified: boolean;
  confidence: number;
  reasoning: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class GeminiAPIClient {
  private baseURL: string;
  private userId: string;

  constructor() {
    // Use environment variable or default to localhost in dev
    this.baseURL = importMeta.env.VITE_API_URL ?? 'http://localhost:3000';

    // Generate or retrieve user ID for rate limiting
    this.userId = this.getUserId();
  }

  /**
   * Detect skin tone from image
   */
  async detectSkinTone(imageBase64: string, mimeType: string): Promise<SkinToneResult> {
    const response = await this.post<SkinToneResult>('/api/gemini/skin-tone', {
      imageBase64,
      mimeType,
    });

    if (response.success !== true || response.data === undefined) {
      throw new Error(response.error ?? 'Skin tone detection failed');
    }

    return response.data;
  }

  /**
   * Extract features from image
   */
  async extractFeatures(imageBase64: string, mimeType: string): Promise<FeatureExtractionResult> {
    const response = await this.post<FeatureExtractionResult>('/api/gemini/extract-features', {
      imageBase64,
      mimeType,
    });

    if (response.success !== true || response.data === undefined) {
      throw new Error(response.error ?? 'Feature extraction failed');
    }

    return response.data;
  }

  /**
   * Generate clinical recommendation
   */
  async generateRecommendation(
    analysisData: Record<string, unknown>,
  ): Promise<RecommendationResult> {
    const response = await this.post<RecommendationResult>('/api/gemini/recommendation', {
      analysisData,
    });

    if (response.success !== true || response.data === undefined) {
      throw new Error(response.error ?? 'Recommendation generation failed');
    }

    return response.data;
  }

  /**
   * Verify web content
   */
  async verifyWebContent(query: string, context: string): Promise<VerificationResult> {
    const response = await this.post<VerificationResult>('/api/gemini/verify', {
      query,
      context,
    });

    if (response.success !== true || response.data === undefined) {
      throw new Error(response.error ?? 'Web verification failed');
    }

    return response.data;
  }

  /**
   * Generic POST request with error handling
   */
  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId,
        },
        body: JSON.stringify(body),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
      }

      const data: unknown = await response.json();
      return data as APIResponse<T>;
    } catch (error) {
      console.error('[GeminiClient] Request failed', { endpoint, error });
      throw error;
    }
  }

  /**
   * Get or generate user ID for rate limiting
   */
  private getUserId(): string {
    const storageKey = 'dermatology-ai-user-id';

    let userId = localStorage.getItem(storageKey);

    if (userId === null) {
      // Generate cryptographically secure random user ID
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const randomHex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      userId = `user_${randomHex}`;
      localStorage.setItem(storageKey, userId);
    }

    return userId;
  }
}

// Export singleton instance
export const geminiClient = new GeminiAPIClient();

/**
 * Mock implementation for compatibility with existing code
 * This mimics the GoogleGenAI interface but routes through our API gateway
 */
export class MockGoogleGenAI {
  models = {
    generateContent: async (params: {
      model: string;
      contents: Array<{
        parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
      }>;
      config?: { responseMimeType?: string };
    }) => {
      // Extract image and text from params
      const imagePart = params.contents[0]?.parts.find((p) => p.inlineData !== undefined);
      const textPart = params.contents[0]?.parts.find((p) => p.text !== undefined);

      if (
        imagePart === undefined ||
        imagePart.inlineData === undefined ||
        textPart === undefined ||
        textPart.text === undefined
      ) {
        throw new Error('Invalid request format');
      }

      const { mimeType, data } = imagePart.inlineData;
      const prompt = textPart.text;

      // Route to appropriate endpoint based on prompt content
      if (prompt.includes('skin tone') || prompt.includes('fitzpatrick')) {
        const result = await geminiClient.detectSkinTone(data, mimeType);
        return { text: JSON.stringify(result) };
      } else if (prompt.includes('extract') || prompt.includes('features')) {
        const result = await geminiClient.extractFeatures(data, mimeType);
        return { text: JSON.stringify(result) };
      } else if (prompt.includes('recommendation')) {
        // Extract analysis data from prompt (simplified)
        const result = await geminiClient.generateRecommendation({});
        return { text: JSON.stringify(result) };
      }

      throw new Error('Unsupported operation');
    },
  };
}
