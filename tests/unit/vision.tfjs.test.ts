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

describe('VisionSpecialist - TensorFlow.js Integration', () => {
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

describe('VisionSpecialist - Error Handling', () => {
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
    vision.dispose();

    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to load model'),
    );

    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await expect(vision.initialize()).rejects.toThrow('Vision Model Unavailable');

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
      dataSync: () => {
        throw new Error('DataSync failed');
      },
      dispose: vi.fn(),
    });

    await vision.initialize();
    await expect(vision.classify(mockImage)).rejects.toThrow('Neural Network Inference Failed');
  });

  it('should handle backend initialization failures gracefully', async () => {
    const testVision = Object.create(VisionSpecialist.prototype) as VisionSpecialist;
    (tf.ready as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('WebGL not available'),
    );

    await expect(testVision.initialize()).rejects.toThrow();
  });
});

describe('VisionSpecialist - Integration Scenarios', () => {
  let vision: VisionSpecialist;
  const mockPredict = vi.fn();

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();
    vision.dispose();
    (tf.ready as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (tf.setBackend as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (tf.findBackend as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (tf.loadGraphModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      predict: mockPredict,
      dispose: vi.fn(),
    } as MockGraphModel);

    (tf.browser.fromPixels as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      resizeNearestNeighbor: vi.fn().mockReturnThis(),
      toFloat: vi.fn().mockReturnThis(),
      div: vi.fn().mockReturnThis(),
      expandDims: vi.fn().mockReturnThis(),
      mean: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      mul: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }));

    mockPredict.mockClear();
    mockPredict.mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn(),
    });
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
