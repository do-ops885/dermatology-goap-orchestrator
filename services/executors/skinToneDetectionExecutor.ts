import { Logger } from '../logger';
import { cleanAndParseJSON } from './types';
import type { AgentContext, ExecutorResult } from './types';

export const skinToneDetectionExecutor = async ({ ai, file, base64Image, setWarning, analysisPayload, privacyMode }: AgentContext): Promise<ExecutorResult> => {
  if (privacyMode) {
    Logger.info('Skin-Tone-Agent', 'Privacy Mode Enabled: Skipping Cloud Analysis');
    Object.assign(analysisPayload, { 
      skinTone: 'Unspecified',
      skinToneConfidence: 0.5 
    });
    return {
      metadata: { fitzpatrick: 'Unspecified', confidence: '50% (Privacy Mode)' },
      newStateUpdates: { fitzpatrick_type: 'IV', skin_tone_detected: true, is_low_confidence: true },
      shouldReplan: false
    };
  }

  const skinTonePrompt = `Analyze the skin in this image for clinical classification.
  OUTPUT JSON ONLY: { 
    "fitzpatrick_type": "I" | "II" | "III" | "IV" | "V" | "VI", 
    "monk_scale": "string", 
    "ita_estimate": number, 
    "skin_tone_confidence": number (0.0-1.0), 
    "reasoning": "string" 
  }`;
  
  const toneResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ inlineData: { mimeType: file.type, data: base64Image } }, { text: skinTonePrompt }] }],
    config: { responseMimeType: 'application/json' }
  });

  const toneJson = cleanAndParseJSON(toneResponse.text);
  const confidence = typeof toneJson.skin_tone_confidence === 'number' ? toneJson.skin_tone_confidence : 0.5;
  
  const isLowConfidence = confidence < 0.65;
  
  if (isLowConfidence) {
    setWarning(`Low detection confidence (${(confidence * 100).toFixed(0)}%). Triggering Safety Calibration.`);
  }

  Object.assign(analysisPayload, { 
    skinTone: toneJson.fitzpatrick_type,
    skinToneConfidence: confidence 
  });

  return {
    metadata: {
      fitzpatrick: toneJson.fitzpatrick_type,
      confidence: `${(confidence * 100).toFixed(1)}%`,
      status: isLowConfidence ? 'LOW_CONFIDENCE_FALLBACK' : 'HIGH_CONFIDENCE'
    },
    newStateUpdates: {
      fitzpatrick_type: toneJson.fitzpatrick_type,
      confidence_score: confidence,
      is_low_confidence: isLowConfidence,
      skin_tone_detected: true
    },
    shouldReplan: isLowConfidence
  };
};
