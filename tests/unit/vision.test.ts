import * as tf from '@tensorflow/tfjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VisionSpecialist } from '../../services/vision';

// Mock TFJS
vi.mock('@tensorflow/tfjs', async () => {
  const actual = await vi.importActual('@tensorflow/tfjs');
  return {
    ...actual,
    ready: vi.fn().mockResolvedValue(undefined),
    setBackend: vi.fn().mockResolvedValue(undefined),
    loadGraphModel: vi.fn(),
    findBackend: vi.fn(),
    tidy: (fn: () => unknown): unknown => fn(),
    browser: {
        fromPixels: vi.fn().mockReturnValue({
            resizeNearestNeighbor: vi.fn().mockReturnValue({
                toFloat: vi.fn().mockReturnValue({
                    div: vi.fn().mockReturnValue({
                        expandDims: vi.fn()
                    })
                })
            })
        }),
        toPixels: vi.fn()
    },
    scalar: vi.fn().mockReturnValue({
        sub: vi.fn().mockReturnValue({
            div: vi.fn()
        })
    }),
    image: {
        resizeBilinear: vi.fn()
    },
    stack: vi.fn()
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
        dispose: vi.fn()
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
        dispose: vi.fn()
    });

    await vision.initialize();
    const results = await vision.classify(mockImage);

    expect(results).toHaveLength(3);
    // 0.8 is highest at index 1
    // mappedIndex = (1 + floor(0.8 * 100)) % 7 = 81 % 7 = 4 -> CLASSES[4] = 'Melanoma'
    expect(results[0].label).toBe('Melanoma'); 
  });

  it('should handle model loading errors', async () => {
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network Error"));
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
        dispose: vi.fn()
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
        .mockReturnValueOnce(true);  // webgl found
      
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
      // Just verify the method exists
      expect(vision.getHeatmap).toBeDefined();
      expect(typeof vision.getHeatmap).toBe('function');
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
        dispose: vi.fn()
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
        dispose: vi.fn()
      });
      
      await vision.initialize();
      const results = await vision.classify(mockImage);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      
      // Verify structure
      results.forEach(result => {
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('score');
        expect(typeof result.label).toBe('string');
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});