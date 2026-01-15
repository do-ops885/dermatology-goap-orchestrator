import { Logger } from '../logger';

import type { AgentContext, ExecutorResult } from './types';

export const recommendationExecutor = async ({
  ai,
  localLLM,
  currentState,
  analysisPayload,
  setResult,
  privacyMode,
}: AgentContext): Promise<ExecutorResult> => {
  const recPrompt = `Generate one short clinical recommendation for Fitzpatrick Type ${String(currentState.fitzpatrick_type)} with ${String(analysisPayload.risk_label)} risk. Consider this context: ${String(((analysisPayload as Record<string, unknown>).webVerification as { summary?: string })?.summary || 'Standard analysis')}. Max 25 words.`;
  let recommendation = '';
  let engine = '';

  if (localLLM.isReady) {
    try {
      recommendation = await localLLM.generate(recPrompt, 'You are a dermatologist assistant.');
      engine = 'SmolLM2-1.7B';
    } catch {
      Logger.warn('Rec-Agent', 'Local LLM recs failed');
    }
  }

  if (!recommendation && navigator.onLine && !privacyMode) {
    try {
      const recResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: recPrompt }] }],
      });
      recommendation = recResponse.text?.trim() ?? '';
      engine = 'Gemini-3-Flash';
    } catch {
      Logger.warn('Rec-Agent', 'Cloud recommendation failed');
    }
  }

  if (!recommendation) {
    recommendation = 'Consult a certified dermatologist for a biopsy and further analysis.';
    engine = 'Hardcoded-Fallback';
  }

  analysisPayload.recommendations = [recommendation];
  setResult({ ...analysisPayload });

  return { metadata: { generated: true, engine } };
};
