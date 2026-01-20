import * as tf from '@tensorflow/tfjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VisionSpecialist } from '../../services/vision';

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
        return createMockTensor();
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

describe('VisionSpecialist - Dispose', () => {
  let vision: VisionSpecialist;
  const mockPredict = vi.fn();

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();
    vision.dispose();
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (tf.setBackend as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      predict: mockPredict,
      dispose: vi.fn(),
    } as MockGraphModel);
  });

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

    vi.clearAllMocks();
    await vision.initialize();

    expect(tf.ready).toHaveBeenCalled();
  });

  it('should handle dispose when model is null', () => {
    const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;

    expect(() => testVision.dispose()).not.toThrow();
  });
});

describe('VisionSpecialist - Classification Edge Cases', () => {
  let vision: VisionSpecialist;
  const mockPredict = vi.fn();

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();
    vision.dispose();
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (tf.setBackend as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      predict: mockPredict,
      dispose: vi.fn(),
    } as MockGraphModel);
  });

  it('should throw error if model not loaded', async () => {
    const mockImage = document.createElement('img');
    const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;

    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(testVision.classify(mockImage)).rejects.toThrow('Vision Model not loaded');
  });

  it('should handle inference errors gracefully', async () => {
    const mockImage = document.createElement('img');

    vision.dispose();
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockPredict.mockImplementation(() => {
      throw new Error('GPU out of memory');
    });

    await vision.initialize();

    await expect(vision.classify(mockImage)).rejects.toThrow('Neural Network Inference Failed');
  });

  it('should return array of classification results with scores', async () => {
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
