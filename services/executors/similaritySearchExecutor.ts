import type { AgentContext, ExecutorResult, ClinicalAnalysisResult } from './types';
import type { ReasoningPattern } from '../../types';

export const similaritySearchExecutor = async ({
  reasoningBank,
  currentState,
  analysisPayload,
  setResult,
}: AgentContext): Promise<ExecutorResult> => {
  const lesions = analysisPayload.lesions as { type?: string }[] | undefined;
  const query = `Fitzpatrick ${String(currentState.fitzpatrick_type)}, ${String(lesions?.[0]?.type) || 'Lesion'}`;
  // Convert query string to embedding (mock implementation)
  const embedding = new Float32Array(384); // Standard embedding dimension
  for (let i = 0; i < Math.min(query.length, embedding.length); i++) {
    embedding[i] = query.charCodeAt(i) / 255;
  }

  const matches = (await reasoningBank.searchPatterns({
    taskEmbedding: embedding,
    k: 10,
  })) as ReasoningPattern[];

  Object.assign(analysisPayload, { similarCases: matches });
  setResult(analysisPayload as unknown as ClinicalAnalysisResult);

  return {
    metadata: {
      matches: matches.length,
      top_match: matches[0]?.outcome ?? 'None',
      similarity: matches[0]?.score?.toFixed(2) ?? '0.00',
    },
  };
};
