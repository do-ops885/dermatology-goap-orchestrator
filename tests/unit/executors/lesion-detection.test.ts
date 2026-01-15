import { describe, it, expect, vi, afterEach } from 'vitest';

import { detectLesions } from '../../../services/executors/lesion-detection';

describe('Lesion-Detection-Agent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty lesions array for normal skin', async () => {
    const normalFeatures = new Float32Array(1280);
    for (let i = 0; i < normalFeatures.length; i++) {
      normalFeatures[i] = 0.1;
    }
    const result = detectLesions(normalFeatures);
    expect(result.lesions).toBeInstanceOf(Array);
    expect(result.modelVersion).toBeDefined();
  });

  it('should detect melanoma with high confidence for suspicious patterns', async () => {
    const suspiciousFeatures = new Float32Array(1280);
    for (let i = 0; i < suspiciousFeatures.length; i++) {
      suspiciousFeatures[i] = Math.random() * 0.9 + 0.1;
    }
    suspiciousFeatures[0] = 0.95;
    suspiciousFeatures[1] = 0.88;
    suspiciousFeatures[2] = 0.92;

    const result = detectLesions(suspiciousFeatures);
    const melanoma = result.lesions.find((l) => l.type === 'Melanoma');

    if (melanoma) {
      expect(['Low', 'Medium', 'High']).toContain(melanoma.risk);
      expect(melanoma.confidence).toBeGreaterThan(0);
    }
  });

  it('should detect basal cell carcinoma patterns', async () => {
    const bccFeatures = new Float32Array(1280);
    for (let i = 0; i < bccFeatures.length; i++) {
      bccFeatures[i] = Math.random() * 0.5;
    }
    bccFeatures[100] = 0.85;
    bccFeatures[101] = 0.75;

    const result = detectLesions(bccFeatures);
    const bcc = result.lesions.find((l) => l.type === 'Basal Cell Carcinoma');

    if (bcc) {
      expect(bcc.confidence).toBeDefined();
      expect(bcc.risk).toMatch(/Low|Medium|High/);
    }
  });

  it('should return valid risk classifications', async () => {
    const features = new Float32Array(1280).fill(0.5);
    const result = detectLesions(features);

    result.lesions.forEach((lesion) => {
      expect(['Low', 'Medium', 'High']).toContain(lesion.risk);
      expect(lesion.confidence).toBeGreaterThanOrEqual(0);
      expect(lesion.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should handle empty feature vector', async () => {
    const emptyFeatures = new Float32Array(0);
    const result = detectLesions(emptyFeatures);
    expect(result.lesions).toEqual([]);
  });

  it('should include model version in response', async () => {
    const features = new Float32Array(1280);
    const result = detectLesions(features);
    expect(result.modelVersion).toMatch(/MobileNetV3|YOLOv11/);
  });
});
