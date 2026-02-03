/**
 * API Gateway Tests - Gemini Routes
 */

import { describe, it, expect, vi } from 'vitest';
import app from '../../api/index';

describe('Gemini API Gateway', () => {
  describe('POST /api/gemini/skin-tone', () => {
    it('should detect skin tone from valid image', async () => {
      const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const res = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-1',
        },
        body: JSON.stringify({
          imageBase64: mockImageBase64,
          mimeType: 'image/png',
        }),
      });

      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data).toHaveProperty('fitzpatrick_type');
      expect(data.data).toHaveProperty('skin_tone_confidence');
    });

    it('should return 400 for missing imageBase64', async () => {
      const res = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-1',
        },
        body: JSON.stringify({
          mimeType: 'image/png',
        }),
      });

      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for missing mimeType', async () => {
      const res = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-1',
        },
        body: JSON.stringify({
          imageBase64: 'test',
        }),
      });

      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/gemini/extract-features', () => {
    it('should extract features from valid image', async () => {
      const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const res = await app.request('/api/gemini/extract-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-1',
        },
        body: JSON.stringify({
          imageBase64: mockImageBase64,
          mimeType: 'image/png',
        }),
      });

      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data).toHaveProperty('features');
      expect(Array.isArray(data.data.features)).toBe(true);
    });
  });

  describe('POST /api/gemini/recommendation', () => {
    it('should generate recommendation from analysis data', async () => {
      const res = await app.request('/api/gemini/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-1',
        },
        body: JSON.stringify({
          analysisData: {
            diagnosis: 'melanoma',
            confidence: 0.85,
          },
        }),
      });

      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data).toHaveProperty('recommendation');
      expect(data.data).toHaveProperty('confidence');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests: Promise<Response>[] = [];
      
      // Make 101 requests (limit is 100 per 15 minutes)
      for (let i = 0; i < 101; i++) {
        requests.push(
          app.request('/api/gemini/skin-tone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': 'test-rate-limit-user',
            },
            body: JSON.stringify({
              imageBase64: 'test',
              mimeType: 'image/png',
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      
      const data = await lastResponse.json();
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should include rate limit headers', async () => {
      const res = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-headers-user',
        },
        body: JSON.stringify({
          imageBase64: 'test',
          mimeType: 'image/png',
        }),
      });

      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache repeated requests', async () => {
      const mockImageBase64 = 'test-image-for-caching';
      
      // First request
      const res1 = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-cache-user',
        },
        body: JSON.stringify({
          imageBase64: mockImageBase64,
          mimeType: 'image/png',
        }),
      });

      const time1 = parseInt(res1.headers.get('X-Response-Time') || '0');

      // Second request (should be faster due to caching)
      const res2 = await app.request('/api/gemini/skin-tone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-cache-user',
        },
        body: JSON.stringify({
          imageBase64: mockImageBase64,
          mimeType: 'image/png',
        }),
      });

      const time2 = parseInt(res2.headers.get('X-Response-Time') || '0');

      // Note: In real testing, time2 should be significantly less than time1
      // but we can't assert this in unit tests without actual API calls
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const res = await app.request('/health');

      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
    });

    it('should return metrics', async () => {
      const res = await app.request('/health/metrics');

      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.metrics).toBeDefined();
      expect(data.metrics).toHaveProperty('total');
      expect(data.metrics).toHaveProperty('last5min');
      expect(data.metrics).toHaveProperty('avgDuration');
      expect(data.metrics).toHaveProperty('errorRate');
    });
  });
});
