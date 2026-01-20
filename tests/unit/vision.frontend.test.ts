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

describe('VisionSpecialist - Initialization & Singleton', () => {
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

  it('should initialize and select backend', async () => {
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

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

  it('should return the same instance on multiple calls', () => {
    const instance1 = VisionSpecialist.getInstance();
    const instance2 = VisionSpecialist.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('should maintain state across getInstance calls', async () => {
    const instance1 = VisionSpecialist.getInstance();
    const instance2 = VisionSpecialist.getInstance();

    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await instance1.initialize();

    const mockImage = document.createElement('img');
    mockPredict.mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn(),
    });

    const results = await instance2.classify(mockImage);
    expect(results).toBeDefined();
  });
});

describe('VisionSpecialist - Backend Selection', () => {
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
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({});

    const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
    await testVision.initialize();

    expect(tf.setBackend).toHaveBeenCalledWith('webgl');
  });

  it('should fallback to CPU if neither WebGPU nor WebGL available', async () => {
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

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

    expect(tf.ready).not.toHaveBeenCalled();
    expect(tf.setBackend).not.toHaveBeenCalled();
  });
});

describe('VisionSpecialist - Heatmap & Tensor Stats', () => {
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

  it('should be defined and callable', () => {
    expect(vision.getHeatmap).toBeDefined();
    expect(typeof vision.getHeatmap).toBe('function');
  });

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
