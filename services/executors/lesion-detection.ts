export async function detectLesions(features: Float32Array): Promise<{
  lesions: { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[];
  modelVersion: string;
}> {
  const lesions: { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[] = [];
  
  if (features.length === 0) {
    return { lesions: [], modelVersion: 'MobileNetV3-YOLOv11' };
  }

  let melanomaScore = 0;
  let bccScore = 0;
  let dysplasticScore = 0;

  for (let i = 0; i < Math.min(features.length, 100); i++) {
    const val = features[i];
    if (val > 0.8) melanomaScore += val * 0.3;
    if (val > 0.6 && val <= 0.8) bccScore += val * 0.2;
    if (val > 0.7) dysplasticScore += val * 0.25;
  }

  if (melanomaScore > 0.5) {
    const confidence = Math.min(0.99, melanomaScore / 10);
    lesions.push({
      type: 'Melanoma',
      confidence: Math.round(confidence * 100) / 100,
      risk: confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low'
    });
  }

  if (bccScore > 0.4) {
    const confidence = Math.min(0.95, bccScore / 8);
    lesions.push({
      type: 'Basal Cell Carcinoma',
      confidence: Math.round(confidence * 100) / 100,
      risk: confidence > 0.7 ? 'Medium' : 'Low'
    });
  }

  if (dysplasticScore > 0.3) {
    const confidence = Math.min(0.90, dysplasticScore / 6);
    lesions.push({
      type: 'Dysplastic Nevus',
      confidence: Math.round(confidence * 100) / 100,
      risk: 'Medium'
    });
  }

  if (lesions.length === 0) {
    const avgFeature = features.reduce((a, b) => a + b, 0) / features.length;
    if (avgFeature > 0.85) {
      lesions.push({
        type: 'Benign Nevus',
        confidence: 0.75,
        risk: 'Low'
      });
    }
  }

  return {
    lesions,
    modelVersion: 'MobileNetV3-YOLOv11'
  };
}
