import { cleanAndParseJSON } from './types';

import type { AgentContext, ExecutorResult } from './types';

export const featureExtractionExecutor = async ({
  ai,
  file,
  base64Image,
  privacyMode,
}: AgentContext): Promise<ExecutorResult> => {
  if (privacyMode) {
    return {
      metadata: { bias_score: 0.1, status: 'privacy_skipped' },
      newStateUpdates: { fairness_score: 0.9 },
    };
  }

  const discoPrompt = `Extract skin features. OUTPUT JSON ONLY: { "bias_score": number (0-1), "disentanglement_index": number, "fairness_validated": boolean }`;
  const discoResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [{ inlineData: { mimeType: file.type, data: base64Image } }, { text: discoPrompt }],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });
  const discoJson = cleanAndParseJSON(discoResponse.text);

  return {
    metadata: { bias_score: discoJson.bias_score, status: 'validated' },
    newStateUpdates: { fairness_score: 1 - discoJson.bias_score },
  };
};
