import { loadImageElement } from './types';

import type { AgentContext, ExecutorResult } from './types';

export const lesionDetectionExecutor = async ({ visionSpecialist, file, currentState, analysisPayload, setResult }: AgentContext): Promise<ExecutorResult> => {
  const imgElement = await loadImageElement(file);
  const predictions = await visionSpecialist.classify(imgElement);
  const heatmapUrl = await visionSpecialist.getHeatmap(imgElement);
  
  const lesions = predictions.map(p => ({
    type: p.label,
    confidence: p.score,
    heatmap: heatmapUrl
  }));

  const highRiskClasses = ['Melanoma', 'Basal Cell Carcinoma', 'Squamous Cell Carcinoma'];
  const primaryLesion = lesions[0];
  const riskLabel = highRiskClasses.includes(primaryLesion.type) ? 'High' : (primaryLesion.confidence < 0.5 ? 'Indeterminate' : 'Low');

  Object.assign(analysisPayload, {
    lesions,
    differential_diagnosis: lesions.slice(1, 4).map(l => l.type),
    risk_label: riskLabel,
    type: currentState.fitzpatrick_type,
    confidence: primaryLesion.confidence,
    fairness: currentState.fairness_score,
    reasoning: `MobileNetV3 inference detected ${primaryLesion.type} with ${(primaryLesion.confidence * 100).toFixed(1)}% confidence.`
  });
  
  setResult({ ...analysisPayload });
  
  return { 
    metadata: { 
      model: 'MobileNetV3 (TF.js/WebGPU)', 
      top_class: primaryLesion.type,
      inference_engine: 'Client-Side',
      grad_cam: true
    } 
  };
};
