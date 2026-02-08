/**
 * Web Worker for ML Inference
 *
 * Offloads heavy TensorFlow.js computations to a separate thread
 * to keep the main thread responsive.
 *
 * @see plans/24_performance_optimization_strategy.md
 */

import * as tf from '@tensorflow/tfjs';

const ERROR_IMAGE_DATA_REQUIRED = 'ImageData required';

interface InferenceRequest {
  type: 'classify' | 'preprocess' | 'saliency';
  data: {
    imageData?: ImageData;
    tensor?: number[][][];
    modelURL?: string;
  };
  id: string;
}

interface InferenceResponse {
  type: 'success' | 'error';
  id: string;
  result?: unknown;
  error?: string;
}

interface InitMessage {
  type: 'init';
  modelURL: string;
}

// Initialize TensorFlow.js
let model: tf.LayersModel | null = null;

function isValidInferenceRequest(message: unknown): message is InferenceRequest {
  if (typeof message !== 'object' || message === null) return false;

  const maybe = message as { type?: unknown; data?: unknown; id?: unknown };

  if (typeof maybe.id !== 'string') return false;
  if (typeof maybe.type !== 'string') return false;
  if (!['classify', 'preprocess', 'saliency'].includes(maybe.type)) return false;
  if (typeof maybe.data !== 'object' || maybe.data === null) return false;

  return true;
}

/**
 * Load ML model
 */
async function loadModel(modelURL: string): Promise<void> {
  if (model !== null) return;

  try {
    model = await tf.loadLayersModel(modelURL);
    postMessage({ type: 'model_loaded' });
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Preprocess image for inference
 */
function preprocessImage(imageData: ImageData): tf.Tensor {
  return tf.tidy(() => {
    // Convert ImageData to tensor
    const tensor = tf.browser.fromPixels(imageData);

    // Resize to model input size (e.g., 224x224)
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);

    // Normalize to [-1, 1]
    const normalized = resized.div(127.5).sub(1);

    // Add batch dimension
    return normalized.expandDims(0);
  });
}

/**
 * Run classification inference
 */
async function classify(imageData: ImageData): Promise<unknown> {
  if (model === null) {
    throw new Error('Model not loaded');
  }

  return tf.tidy(() => {
    const input = preprocessImage(imageData);
    const predictions = model!.predict(input) as tf.Tensor;

    // Get top predictions
    const values = predictions.dataSync();
    return Array.from(values)
      .map((value, index) => ({ value, index }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  });
}

/**
 * Generate saliency map
 */
async function generateSaliency(imageData: ImageData): Promise<number[][]> {
  if (model === null) {
    throw new Error('Model not loaded');
  }

  return tf.tidy(() => {
    const input = preprocessImage(imageData);

    // Compute gradients
    const gradients = tf.grad((x: tf.Tensor) => {
      const pred = model!.predict(x) as tf.Tensor;
      return pred.max();
    })(input);

    // Convert to 2D array
    const saliency = tf
      .abs(gradients as tf.Tensor)
      .mean(-1)
      .squeeze();
    return saliency.arraySync() as number[][];
  });
}

/**
 * Handle incoming messages
 */
self.onmessage = async (event: MessageEvent<InferenceRequest>) => {
  if (!isValidInferenceRequest(event.data)) {
    // Ignore or report unexpected messages that do not match the expected shape
    return;
  }

  const { type, data, id } = event.data;

  try {
    let result;

    switch (type) {
      case 'classify':
        if (data.imageData === undefined) throw new Error(ERROR_IMAGE_DATA_REQUIRED);
        result = await classify(data.imageData);
        break;

      case 'preprocess':
        if (data.imageData === undefined) throw new Error(ERROR_IMAGE_DATA_REQUIRED);
        result = preprocessImage(data.imageData).arraySync();
        break;

      case 'saliency':
        if (data.imageData === undefined) throw new Error(ERROR_IMAGE_DATA_REQUIRED);
        result = await generateSaliency(data.imageData);
        break;

      default:
        throw new Error(`Unknown request type: ${type}`);
    }

    const response: InferenceResponse = {
      type: 'success',
      id,
      result,
    };

    postMessage(response);
  } catch (error) {
    const response: InferenceResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    postMessage(response);
  }
};

// Handle initialization messages
self.addEventListener(
  'message',
  (event: MessageEvent<InitMessage | InferenceRequest | InferenceResponse>) => {
    const data = event.data;
    if (
      'type' in data &&
      data.type === 'init' &&
      'modelURL' in data &&
      data.modelURL !== undefined
    ) {
      void loadModel(data.modelURL);
    }
  },
);

// Cleanup on termination
self.addEventListener('beforeunload', () => {
  if (model !== null) {
    model.dispose();
  }
  tf.disposeVariables();
});
