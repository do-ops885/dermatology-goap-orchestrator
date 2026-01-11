import type { AgentContext, ExecutorResult } from './types';

export const similaritySearchExecutor = async ({ reasoningBank, currentState, analysisPayload, setResult }: AgentContext): Promise<ExecutorResult> => {
  const query = `Fitzpatrick ${currentState.fitzpatrick_type}, ${analysisPayload.lesions?.[0]?.type || 'Lesion'}`;
  const matches = await reasoningBank.searchPatterns({ 
    task: query, 
    k: 10 
  }) as any[];
  
  Object.assign(analysisPayload, { similarCases: matches });
  setResult({ ...analysisPayload });

  return { 
    metadata: { 
      matches: matches.length,
      top_match: matches[0]?.outcome || 'None',
      similarity: matches[0]?.score?.toFixed(2) || '0.00'
    } 
  };
};
