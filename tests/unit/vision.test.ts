import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { VisionSpecialist } from '../../services/vision';

// Mock TFJS
vi.mock('@tensorflow/tfjs', async () => {
  const actual = await vi.importActual('@tensorflow/tfjs') as any;
  return {
    ...actual,
    ready: vi.fn().mockResolvedValue(undefined),
    setBackend: vi.fn().mockResolvedValue(undefined),
    loadGraphModel: vi.fn(),
    findBackend: vi.fn(),
    tidy: (fn: any) => fn(),
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

describe('VisionSpecialist', () => {
  let vision: VisionSpecialist;
  const mockPredict = vi.fn();

  beforeEach(() => {
    vision = VisionSpecialist.getInstance();
    vi.clearAllMocks();
    
    // Mock Model Loading
    (tf.loadGraphModel as any).mockResolvedValue({
        predict: mockPredict,
        dispose: vi.fn()
    });
  });

  it('should initialize and select backend', async () => {
    (tf.findBackend as any).mockReturnValue(true); // Simulate WebGPU exists
    
    await vision.initialize();
    
    expect(tf.ready).toHaveBeenCalled();
    expect(tf.setBackend).toHaveBeenCalledWith('webgpu');
    expect(tf.loadGraphModel).toHaveBeenCalled();
  });

  it('should classify image and return formatted results', async () => {
    const mockImage = document.createElement('img');
    
    // Mock Prediction: 7 classes
    mockPredict.mockReturnValue({
        dataSync: () => new Float32Array([0.1, 0.8, 0.05, 0.01, 0.01, 0.01, 0.02]),
        dispose: vi.fn()
    });

    await vision.initialize();
    const results = await vision.classify(mockImage);

    expect(results).toHaveLength(3); // Returns top 3
    // 0.8 is highest, index 1 corresponds to BCC in class list
    expect(results[0].label).toBe('Basal Cell Carcinoma'); 
  });

  it('should fail gracefully if model fails to load', async () => {
    (tf.loadGraphModel as any).mockRejectedValue(new Error("Network Error"));
    // Since initialize throws on failure
    await expect(vision.initialize()).rejects.toThrow();
  });
});