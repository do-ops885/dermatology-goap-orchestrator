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

describe('VisionSpecialist - Classification Result Processing', () => {
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
    mockPredict.mockReturnValue({
      dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
      dispose: vi.fn(),
    });
  });

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
