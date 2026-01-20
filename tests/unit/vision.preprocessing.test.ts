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

describe('VisionSpecialist - Image Preprocessing Pipeline', () => {
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
    const mockExpandDims = vi.fn().mockReturnValue({});
    const mockScalarSpy = vi.fn().mockReturnValue({});

    (tf.scalar as unknown as ReturnType<typeof vi.fn>).mockImplementation((val: number) => {
      mockScalarSpy(val);
      return {};
    });

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

    expect(mockScalarSpy).toHaveBeenCalledWith(255);
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
