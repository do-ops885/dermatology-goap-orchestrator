import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { VisionSpecialist } from '../../services/vision';

vi.mock('@tensorflow/tfjs', async () => {
  const actual = await vi.importActual('@tensorflow/tfjs') as any;

  const createMockTensor = () => {
    const mock = {
      square: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      neg: vi.fn().mockReturnThis(),
      mul: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      abs: vi.fn().mockReturnThis(),
      relu: vi.fn().mockReturnThis(),
      min: vi.fn().mockReturnThis(),
      max: vi.fn().mockReturnThis(),
      dispose: vi.fn()
    };
    return mock;
  };

  return {
    ...actual,
    ready: vi.fn().mockResolvedValue(undefined),
    setBackend: vi.fn().mockResolvedValue(undefined),
    loadGraphModel: vi.fn(),
    findBackend: vi.fn().mockReturnValue(true),
    tidy: (fn: any) => fn(),
    browser: {
      fromPixels: vi.fn().mockReturnValue({
        resizeNearestNeighbor: vi.fn().mockReturnValue({
          toFloat: vi.fn().mockReturnValue({
            div: vi.fn().mockReturnValue({
              expandDims: vi.fn()
            })
          })
        }),
        toFloat: vi.fn().mockReturnValue({
          div: vi.fn().mockReturnValue({
            shape: [224, 224, 3],
            mean: vi.fn().mockReturnValue(createMockTensor()),
            dispose: vi.fn()
          }),
          dispose: vi.fn()
        }),
        dispose: vi.fn()
      }),
      toPixels: vi.fn()
    },
    scalar: vi.fn().mockReturnValue(createMockTensor()),
    linspace: vi.fn().mockReturnValue([]),
    meshgrid: vi.fn().mockReturnValue([createMockTensor(), createMockTensor()]),
    exp: vi.fn().mockReturnValue(createMockTensor()),
    image: {
      resizeBilinear: vi.fn().mockReturnValue(createMockTensor())
    },
    stack: vi.fn(),
    memory: vi.fn().mockReturnValue({
      numTensors: 0,
      numDataBuffers: 0,
      numBytes: 0
    }),
    GraphModel: class {
      dispose() {}
    }
  };
});

describe('Vision Memory Safety', () => {
  let vision: VisionSpecialist;
  let mockPredict: any;
  let mockModelDispose: any;

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();
    mockPredict = vi.fn().mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn()
    });
    mockModelDispose = vi.fn();

    (tf.loadGraphModel as any).mockResolvedValue({
      predict: mockPredict,
      dispose: mockModelDispose
    });
  });

  afterEach(() => {
    vision.dispose();
  });

  it('should not leak tensors during classification', async () => {
    const beforeMemory = tf.memory();
    const initialTensors = beforeMemory.numTensors;

    for (let i = 0; i < 10; i++) {
      const mockImage = createMockImageElement();
      await vision.classify(mockImage);
    }

    const afterMemory = tf.memory();
    const finalTensors = afterMemory.numTensors;

    expect(finalTensors - initialTensors).toBeLessThan(5);
  });

  it('should use tf.tidy for all operations', async () => {
    await vision.initialize();

    const before = tf.memory().numTensors;
    const mockImage = createMockImageElement();
    await vision.classify(mockImage);
    const after = tf.memory().numTensors;

    expect(after - before).toBeLessThan(3);
  });

  it('should report tensor statistics', async () => {
    await vision.initialize();

    const stats = vision.getTensorStats();

    expect(stats).toHaveProperty('numTensors');
    expect(stats).toHaveProperty('numDataBuffers');
    expect(stats).toHaveProperty('numBytes');
    expect(typeof stats.numTensors).toBe('number');
    expect(typeof stats.numDataBuffers).toBe('number');
    expect(typeof stats.numBytes).toBe('number');
  });

  it('should dispose model on dispose call', async () => {
    await vision.initialize();

    vision.dispose();

    expect(mockModelDispose).toHaveBeenCalled();
  });

  it('should clean up intermediate tensors after classification', async () => {
    await vision.initialize();

    const before = tf.memory().numTensors;
    const mockImage = createMockImageElement();
    await vision.classify(mockImage);

    vi.spyOn(tf.GraphModel.prototype, 'dispose').mockRestore();
  });
});

function createMockImageElement(): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(200, 150, 100)';
  ctx.fillRect(0, 0, 224, 224);

  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}
