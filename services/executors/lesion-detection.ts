export function detectLesions(features: Float32Array): {
  lesions: { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[];
  modelVersion: string;
} {
  if (features.length === 0) {
    return { lesions: [], modelVersion: 'MobileNetV3-YOLOv11' };
  }

  const scores = calculateScores(features);
  const lesions = detectSpecificLesions(scores);
  addBenignNevusIfNone(lesions, features);

  return {
    lesions,
    modelVersion: 'MobileNetV3-YOLOv11',
  };
}

function calculateScores(features: Float32Array): {
  melanoma: number;
  bcc: number;
  dysplastic: number;
} {
  let melanomaScore = 0;
  let bccScore = 0;
  let dysplasticScore = 0;

  for (let i = 0; i < Math.min(features.length, 100); i++) {
    const val = features[i];
    if (val !== undefined && val > 0.8) melanomaScore += val * 0.3;
    if (val !== undefined && val > 0.6 && val <= 0.8) bccScore += val * 0.2;
    if (val !== undefined && val > 0.7) dysplasticScore += val * 0.25;
  }

  return { melanoma: melanomaScore, bcc: bccScore, dysplastic: dysplasticScore };
}

function detectSpecificLesions(scores: {
  melanoma: number;
  bcc: number;
  dysplastic: number;
}): { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[] {
  const lesions: { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[] = [];

  if (scores.melanoma > 0.5) {
    lesions.push(
      createLesion('Melanoma', Math.min(0.99, scores.melanoma / 10), (c) =>
        c > 0.8 ? 'High' : c > 0.6 ? 'Medium' : 'Low',
      ),
    );
  }

  if (scores.bcc > 0.4) {
    lesions.push(
      createLesion('Basal Cell Carcinoma', Math.min(0.95, scores.bcc / 8), (c) =>
        c > 0.7 ? 'Medium' : 'Low',
      ),
    );
  }

  if (scores.dysplastic > 0.3) {
    lesions.push({
      type: 'Dysplastic Nevus',
      confidence: Math.round(Math.min(0.9, scores.dysplastic / 6) * 100) / 100,
      risk: 'Medium',
    });
  }

  return lesions;
}

function createLesion(
  type: string,
  confidence: number,
  riskFn: (c: number) => 'Low' | 'Medium' | 'High',
): { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' } {
  const roundedConfidence = Math.round(confidence * 100) / 100;
  return {
    type,
    confidence: roundedConfidence,
    risk: riskFn(roundedConfidence),
  };
}

function addBenignNevusIfNone(
  lesions: { type: string; confidence: number; risk: 'Low' | 'Medium' | 'High' }[],
  features: Float32Array,
): void {
  if (lesions.length === 0) {
    const avgFeature = features.reduce((a, b) => a + b, 0) / features.length;
    if (avgFeature > 0.85) {
      lesions.push({
        type: 'Benign Nevus',
        confidence: 0.75,
        risk: 'Low',
      });
    }
  }
}
