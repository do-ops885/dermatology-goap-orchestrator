import type { AgentContext, ExecutorResult } from './types';
import { Logger } from '../logger';

export const webVerificationExecutor = async ({ ai, currentState, analysisPayload, setResult, privacyMode }: AgentContext): Promise<ExecutorResult> => {
  if (privacyMode) {
    Object.assign(analysisPayload, {
      webVerification: { verified: false, sources: [], summary: "Privacy Mode: Web verification skipped." }
    });
    setResult({ ...analysisPayload });
    return { metadata: { status: 'skipped_privacy' } };
  }

  if (!navigator.onLine) {
    Object.assign(analysisPayload, {
      webVerification: { verified: false, sources: [], summary: "Offline Mode: Web verification skipped." }
    });
    setResult({ ...analysisPayload });
    return { metadata: { status: 'skipped_offline' } };
  }

  const lesionType = analysisPayload.lesions?.[0]?.type || 'skin condition';
  const query = `latest clinical guidelines and risk factors for ${lesionType} in Fitzpatrick skin type ${currentState.fitzpatrick_type || 'unspecified'}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'text/plain' 
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((c: any) => ({
        title: c.web?.title,
        uri: c.web?.uri
      }))
      .filter((s: any) => s.uri)
      .slice(0, 3) || [];
    
    Object.assign(analysisPayload, {
      webVerification: {
        verified: true,
        sources,
        summary: response.text
      }
    });
    setResult({ ...analysisPayload });

    return { metadata: { source_count: sources.length, engine: 'Gemini 3 Flash + Google Search' } };
  } catch (e) {
    Logger.warn('Web-Agent', "Web Verification Failed", { error: e });
    return { metadata: { status: 'failed', error: 'api_unreachable' } };
  }
};
