import { describe, it, expect } from 'vitest';

import { detectSkinTone } from '../../../services/executors/skin-tone-detection';

describe('Skin-Tone-Detection-Agent', () => {
  it('should return high confidence for clear skin samples', async () => {
    const imageData = new ImageData(100, 100);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 200;
      imageData.data[i + 1] = 150;
      imageData.data[i + 2] = 100;
      imageData.data[i + 3] = 255;
    }
    const result = detectSkinTone(imageData);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.fitzpatrick).toMatch(/[I|II|III|IV|V|VI]/);
  });

  it('should return low confidence for poor lighting', async () => {
    const imageData = new ImageData(100, 100);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 30;
      imageData.data[i + 1] = 30;
      imageData.data[i + 2] = 30;
      imageData.data[i + 3] = 255;
    }
    const result = detectSkinTone(imageData);
    expect(result.fitzpatrick).toBeDefined();
    expect(result.confidence).toBeLessThan(0.8);
  });

  it('should return valid Monk scale value', async () => {
    const imageData = new ImageData(100, 100);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 180;
      imageData.data[i + 1] = 140;
      imageData.data[i + 2] = 120;
      imageData.data[i + 3] = 255;
    }
    const result = detectSkinTone(imageData);
    expect(result.monkScale).toMatch(/^F[1-9]|F10$/);
  });

  it('should calculate ITA estimate in valid range', async () => {
    const imageData = new ImageData(100, 100);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;
      imageData.data[i + 1] = 220;
      imageData.data[i + 2] = 180;
      imageData.data[i + 3] = 255;
    }
    const result = detectSkinTone(imageData);
    expect(result.itaEstimate).toBeGreaterThanOrEqual(0);
    expect(result.itaEstimate).toBeLessThanOrEqual(90);
  });

  it('should throw error for invalid image data', async () => {
    const invalidImageData = { width: 0, height: 0, data: new Uint8ClampedArray(0) } as ImageData;
    await expect(detectSkinTone(invalidImageData)).rejects.toThrow('Invalid image data');
  });
});
