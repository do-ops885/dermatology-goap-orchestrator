/**
 * Web Worker for ML Inference
 * 
 * Offloads heavy TensorFlow.js computations to a separate thread
 * to keep the main thread responsive.
 * 
 * @see plans/24_performance_optimization_strategy.md
 */

import * as tf from '@tensorflow/tfjs';

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
  result?: any;
  error?: string;
}

// Initialize TensorFlow.js
let model: tf.LayersModel | null = null;

/**
 * Load ML model
 */
async function loadModel(modelURL: string): Promise<void> {
  if (model) return;
  
  try {
    model = await tf.loadLayersModel(modelURL);
    postMessage({ type: 'model_loaded' });
  } catch (error) {
    postMessage({ 
      type: 'error', 
      error: `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
async function classify(imageData: ImageData): Promise<any> {
  if (!model) {
    throw new Error('Model not loaded');
  }

  return tf.tidy(() => {
    const input = preprocessImage(imageData);
    const predictions = model!.predict(input) as tf.Tensor;
    
    // Get top predictions
    const values = predictions.dataSync();
    const topK = Array.from(values)
      .map((value, index) => ({ value, index }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return topK;
  });
}

/**
 * Generate saliency map
 */
async function generateSaliency(imageData: ImageData): Promise<number[][]> {
  if (!model) {
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
    const saliency = tf.abs(gradients as tf.Tensor).mean(-1).squeeze();
    const values = saliency.arraySync() as number[][];
    
    return values;
  });
}

/**
 * Handle incoming messages
 */
self.onmessage = async (event: MessageEvent<InferenceRequest>) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'classify':
        if (!data.imageData) throw new Error('ImageData required');
        result = await classify(data.imageData);
        break;
        
      case 'preprocess':
        if (!data.imageData) throw new Error('ImageData required');
        result = preprocessImage(data.imageData).arraySync();
        break;
        
      case 'saliency':
        if (!data.imageData) throw new Error('ImageData required');
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
self.addEventListener('message', (event) => {
  if (event.data.type === 'init') {
    const modelURL = event.data.modelURL;
    if (modelURL) {
      void loadModel(modelURL);
    }
  }
});

// Cleanup on termination
self.addEventListener('beforeunload', () => {
  if (model) {
    model.dispose();
  }
  tf.disposeVariables();
});
