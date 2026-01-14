import { Logger } from '../logger';

import type { AgentContext, ExecutorResult, ClinicalAnalysisResult } from './types';

interface WebSource {
  title?: string;
  uri?: string;
}

function isValidSource(s: WebSource): s is { title?: string | undefined; uri: string } {
  return typeof s.uri === 'string' && s.uri.length > 0;
}

export const webVerificationExecutor = async ({
  ai,
  currentState,
  analysisPayload,
  setResult,
  privacyMode,
}: AgentContext): Promise<ExecutorResult> => {
  if (privacyMode) {
    Object.assign(analysisPayload, {
      webVerification: {
        verified: false,
        sources: [],
        summary: 'Privacy Mode: Web verification skipped.',
      },
    });
    setResult(analysisPayload as unknown as ClinicalAnalysisResult);
    return { metadata: { status: 'skipped_privacy' } };
  }

  if (!navigator.onLine) {
    Object.assign(analysisPayload, {
      webVerification: {
        verified: false,
        sources: [],
        summary: 'Offline Mode: Web verification skipped.',
      },
    });
    setResult(analysisPayload as unknown as ClinicalAnalysisResult);
    return { metadata: { status: 'skipped_offline' } };
  }

  const lesions = analysisPayload.lesions as { type?: string }[] | undefined;
  const lesionType = lesions?.[0]?.type ?? 'skin condition';
  const query = `latest clinical guidelines and risk factors for ${lesionType} in Fitzpatrick skin type ${String(currentState.fitzpatrick_type) || 'unspecified'}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'text/plain',
      },
    });

    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .map((c: WebSource) => ({
        title: c.title,
        uri: c.uri,
      }))
      .filter(isValidSource)
      .slice(0, 3);

    Object.assign(analysisPayload, {
      webVerification: {
        verified: true,
        sources,
        summary: response.text,
      },
    });
    setResult(analysisPayload as unknown as ClinicalAnalysisResult);

    return { metadata: { source_count: sources.length, engine: 'Gemini 3 Flash + Google Search' } };
  } catch (e) {
    Logger.warn('Web-Agent', 'Web Verification Failed', { error: e });
    return { metadata: { status: 'failed', error: 'api_unreachable' } };
  }
};
