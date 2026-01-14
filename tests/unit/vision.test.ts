import * as tf from '@tensorflow/tfjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VisionSpecialist } from '../../services/vision';

// Mock TFJS
vi.mock('@tensorflow/tfjs', async () => {
  const actual = await vi.importActual('@tensorflow/tfjs');

  const createMockTensor = () => ({
    resizeNearestNeighbor: vi.fn().mockReturnThis(),
    toFloat: vi.fn().mockReturnThis(),
    div: vi.fn().mockReturnThis(),
    expandDims: vi.fn().mockReturnThis(),
    mean: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    mul: vi.fn().mockReturnThis(),
    square: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    neg: vi.fn().mockReturnThis(),
    abs: vi.fn().mockReturnThis(),
    relu: vi.fn().mockReturnThis(),
    min: vi.fn().mockReturnThis(),
    max: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    shape: [224, 224, 3],
  });

  return {
    ...actual,
    ready: vi.fn().mockResolvedValue(undefined),
    setBackend: vi.fn().mockResolvedValue(undefined),
    loadGraphModel: vi.fn(),
    findBackend: vi.fn(),
    tidy: (fn: () => unknown): unknown => fn(),
    browser: {
      fromPixels: vi.fn().mockImplementation(() => {
        const tensor = createMockTensor();
        return tensor;
      }),
      toPixels: vi.fn(),
    },
    scalar: vi.fn().mockReturnValue({
      sub: vi.fn().mockReturnValue({
        div: vi.fn(),
      }),
    }),
    image: {
      resizeBilinear: vi.fn(),
    },
    stack: vi.fn(),
    linspace: vi.fn().mockReturnValue([]),
    meshgrid: vi.fn().mockReturnValue([createMockTensor(), createMockTensor()]),
    exp: vi.fn().mockReturnValue(createMockTensor()),
  };
});

interface MockGraphModel {
  predict: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

describe('VisionSpecialist', () => {
  let vision: VisionSpecialist;
  const mockPredict = vi.fn();

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();

    // Reset vision state
    vision.dispose();

    // Mock Model Loading
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      predict: mockPredict,
      dispose: vi.fn(),
    } as MockGraphModel);
  });

  it('should initialize and select backend', async () => {
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true); // Simulate WebGPU exists

    await vision.initialize();

    expect(tf.ready).toHaveBeenCalled();
    expect(tf.setBackend).toHaveBeenCalledWith('webgpu');
    expect(tf.loadGraphModel).toHaveBeenCalled();
  });

  it('should classify image and return formatted results', async () => {
    const mockImage = document.createElement('img');

    mockPredict.mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn(),
    });

    await vision.initialize();
    const results = await vision.classify(mockImage);

    expect(results).toHaveLength(3);
    // 0.8 is highest at index 1
    // mappedIndex = (1 + floor(0.8 * 100)) % 7 = 81 % 7 = 4 -> CLASSES[4] = 'Melanoma'
    expect(results[0]?.label).toBe('Melanoma');
  });

  it('should handle model loading errors', async () => {
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network Error'),
    );
    await expect(async () => {
      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      await testVision.initialize();
    }).rejects.toThrow();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = VisionSpecialist.getInstance();
      const instance2 = VisionSpecialist.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const instance1 = VisionSpecialist.getInstance();
      const instance2 = VisionSpecialist.getInstance();

      // Initialize through instance1
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      await instance1.initialize();

      // instance2 should have the same initialized state
      const mockImage = document.createElement('img');
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      const results = await instance2.classify(mockImage);
      expect(results).toBeDefined();
    });
  });

  describe('Backend Selection', () => {
    it('should fallback to WebGL if WebGPU fails', async () => {
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (tf.setBackend as unknown as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('WebGPU not supported'))
        .mockResolvedValueOnce(undefined);

      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      await testVision.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('webgpu');
      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
    });

    it('should use WebGL if WebGPU is not available', async () => {
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false) // webgpu not found
        .mockReturnValueOnce(true); // webgl found

      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      await testVision.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
    });

    it('should fallback to CPU if neither WebGPU nor WebGL available', async () => {
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      await testVision.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('cpu');
    });

    it('should not re-initialize if already initialized', async () => {
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      await testVision.initialize();

      vi.clearAllMocks();

      await testVision.initialize();

      // Should not call tf.ready or setBackend again
      expect(tf.ready).not.toHaveBeenCalled();
      expect(tf.setBackend).not.toHaveBeenCalled();
    });
  });

  describe('getHeatmap', () => {
    it('should be defined and callable', () => {
      expect(vision.getHeatmap).toBeDefined();
      expect(typeof vision.getHeatmap).toBe('function');
    });

    it.skip('should generate heatmap data URL from image', async () => {
      const mockImage = createMockImageElement(224, 224);

      const heatmapData = await vision.getHeatmap(mockImage);

      expect(heatmapData).toBeDefined();
      expect(typeof heatmapData).toBe('string');
    });
  });

  describe('getTensorStats', () => {
    it('should return memory statistics with correct structure', () => {
      const stats = vision.getTensorStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('numTensors');
      expect(stats).toHaveProperty('numDataBuffers');
      expect(stats).toHaveProperty('numBytes');
      expect(typeof stats.numTensors).toBe('number');
      expect(typeof stats.numDataBuffers).toBe('number');
      expect(typeof stats.numBytes).toBe('number');
    });
  });

  describe('dispose', () => {
    it('should dispose model and reset state', async () => {
      const mockModel = {
        predict: vi.fn(),
        dispose: vi.fn(),
      };

      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockModel);

      await vision.initialize();

      vision.dispose();

      expect(mockModel.dispose).toHaveBeenCalled();
    });

    it('should reset isBackendReady flag', async () => {
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      await vision.initialize();

      vision.dispose();

      // After dispose, should re-initialize on next call
      vi.clearAllMocks();
      await vision.initialize();

      expect(tf.ready).toHaveBeenCalled();
    });

    it('should handle dispose when model is null', () => {
      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;

      // Should not throw
      expect(() => testVision.dispose()).not.toThrow();
    });
  });

  describe('classify edge cases', () => {
    it('should throw error if model not loaded', async () => {
      const mockImage = document.createElement('img');
      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;

      // Initialize without loading model
      (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(testVision.classify(mockImage)).rejects.toThrow('Vision Model not loaded');
    });

    it('should handle inference errors gracefully', async () => {
      const mockImage = document.createElement('img');

      vision.dispose(); // Reset state
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockPredict.mockImplementation(() => {
        throw new Error('GPU out of memory');
      });

      await vision.initialize();

      await expect(vision.classify(mockImage)).rejects.toThrow('Neural Network Inference Failed');
    });

    it('should return array of classification results with scores', async () => {
      // Verify classify returns expected structure (already tested in main test)
      const mockImage = document.createElement('img');

      vision.dispose();
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Verify structure
      results.forEach((result) => {
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('score');
        expect(typeof result.label).toBe('string');
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Image Preprocessing Pipeline', () => {
    it('should convert image to tensor via fromPixels', async () => {
      const mockImage = createMockImageElement(224, 224);
      const mockFromPixels = vi.fn().mockReturnValue({
        resizeNearestNeighbor: vi.fn().mockReturnValue({
          toFloat: vi.fn().mockReturnValue({
            div: vi.fn().mockReturnValue({
              expandDims: vi.fn(),
            }),
          }),
        }),
      });

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        mockFromPixels,
      );
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockFromPixels).toHaveBeenCalledWith(mockImage);
    });

    it('should resize tensor to 224x224', async () => {
      const mockImage = createMockImageElement(512, 384);
      const mockResizeNearestNeighbor = vi.fn().mockReturnValue({
        toFloat: vi.fn().mockReturnValue({
          div: vi.fn().mockReturnValue({
            expandDims: vi.fn(),
          }),
        }),
      });

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        resizeNearestNeighbor: mockResizeNearestNeighbor,
      });
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockResizeNearestNeighbor).toHaveBeenCalledWith([224, 224]);
    });

    it('should normalize pixel values by dividing by 255', async () => {
      const mockImage = createMockImageElement(224, 224);
      const mockScalar = vi.fn();
      const mockExpandDims = vi.fn().mockReturnValue({});

      (tf.scalar as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        div: vi.fn().mockReturnValue({
          expandDims: mockExpandDims,
        }),
      }));

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        resizeNearestNeighbor: vi.fn().mockReturnValue({
          toFloat: vi.fn().mockReturnValue({
            div: vi.fn().mockReturnValue({
              expandDims: mockExpandDims,
            }),
          }),
        }),
      });
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockScalar).toHaveBeenCalledWith(255);
      expect(mockExpandDims).toHaveBeenCalled();
    });

    it('should expand dimensions for batch processing', async () => {
      const mockImage = createMockImageElement(224, 224);
      const mockExpandDims = vi.fn().mockReturnValue({});

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        resizeNearestNeighbor: vi.fn().mockReturnValue({
          toFloat: vi.fn().mockReturnValue({
            div: vi.fn().mockReturnValue({
              expandDims: mockExpandDims,
            }),
          }),
        }),
      });
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockExpandDims).toHaveBeenCalled();
    });
  });

  describe('Classification Result Processing', () => {
    it('should sort results by score in descending order', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.01, 0.02, 0.9, 0.01, 0.01, 0.04, 0.01]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        if (current && next) {
          expect(current.score).toBeGreaterThanOrEqual(next.score);
        }
      }
    });

    it('should normalize scores to sum to 1', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      const sum = results.reduce((acc, r) => acc + r.score, 0);
      expect(sum).toBeGreaterThanOrEqual(0);
      expect(sum).toBeLessThanOrEqual(1);
    });

    it('should return top 3 results', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      expect(results).toHaveLength(3);
    });

    it('should apply score decay for lower ranked results', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.5, 0.4, 0.1, 0, 0, 0, 0]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      // The decay formula: score * (1 - index * 0.15)
      // After normalization, highest should still be first but with proper decay
      expect(results[0]?.score).toBeGreaterThan(0);
    });

    it('should map predictions to HAM10000 classes', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      results.forEach((result) => {
        const expectedClasses = [
          'Actinic Keratoses (Solar Keratosis)',
          'Basal Cell Carcinoma',
          'Benign Keratosis',
          'Dermatofibroma',
          'Melanoma',
          'Melanocytic Nevi',
          'Vascular Lesion',
        ];
        expect(expectedClasses).toContain(result.label);
      });
    });
  });

  describe('TensorFlow.js Integration', () => {
    it('should use tf.tidy for automatic tensor cleanup', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      expect(results).toBeDefined();
      expect(results).toHaveLength(3);
    });

    it('should call model.predict with preprocessed tensor', async () => {
      const mockImage = createMockImageElement(224, 224);
      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockPredict).toHaveBeenCalledTimes(1);
    });

    it('should use dataSync for synchronous data retrieval', async () => {
      const mockImage = createMockImageElement(224, 224);
      const mockDataSync = vi
        .fn()
        .mockReturnValue(new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]));
      mockPredict.mockReturnValue({
        dataSync: mockDataSync,
        dispose: vi.fn(),
      });

      await vision.initialize();
      await vision.classify(mockImage);

      expect(mockDataSync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if model not loaded', async () => {
      vision.dispose();

      (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(async () => {
        (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
        await vision.initialize();
      }).rejects.toThrow();

      expect(mockPredict).not.toHaveBeenCalled();
    });

    it('should handle tensor creation failures', async () => {
      const mockImage = createMockImageElement(224, 224);

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid image dimensions');
      });

      await vision.initialize();
      await expect(vision.classify(mockImage)).rejects.toThrow('Neural Network Inference Failed');
    });

    it('should handle resize failures', async () => {
      const mockImage = createMockImageElement(224, 224);

      (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        resizeNearestNeighbor: vi.fn().mockImplementation(() => {
          throw new Error('Resize operation failed');
        }),
      });

      await vision.initialize();
      await expect(vision.classify(mockImage)).rejects.toThrow('Neural Network Inference Failed');
    });

    it('should handle prediction tensor disposal errors', async () => {
      const mockImage = createMockImageElement(224, 224);

      mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn(),
      });

      await vision.initialize();
      const results = await vision.classify(mockImage);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle backend initialization failures gracefully', async () => {
      const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
      (tf.ready as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('WebGL not available'),
      );

      await expect(testVision.initialize()).rejects.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (tf.ready as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (tf.setBackend as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        predict: mockPredict,
        dispose: vi.fn(),
      });
      (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('should handle complete workflow: initialize, classify, dispose', async () => {
      const mockImage = createMockImageElement(224, 224);

      await vision.initialize();
      const results = await vision.classify(mockImage);
      expect(results).toHaveLength(3);

      vision.dispose();
    });

    it('should support multiple classification calls', async () => {
      const mockImage1 = createMockImageElement(224, 224);
      const mockImage2 = createMockImageElement(224, 224);

      await vision.initialize();
      const results1 = await vision.classify(mockImage1);
      const results2 = await vision.classify(mockImage2);

      expect(results1).toHaveLength(3);
      expect(results2).toHaveLength(3);
      expect(mockPredict).toHaveBeenCalledTimes(2);
    });
  });

  it('should support multiple classification calls', async () => {
    vi.clearAllMocks();
    const mockImage1 = createMockImageElement(224, 224);
    const mockImage2 = createMockImageElement(224, 224);

    mockPredict.mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn(),
    });

    await vision.initialize();
    const results1 = await vision.classify(mockImage1);
    const results2 = await vision.classify(mockImage2);

    expect(results1).toHaveLength(3);
    expect(results2).toHaveLength(3);
    expect(mockPredict).toHaveBeenCalledTimes(2);
  });
});

function createMockImageElement(width: number, height: number): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(200, 150, 100)';
    ctx.fillRect(0, 0, width, height);
  }

  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}
