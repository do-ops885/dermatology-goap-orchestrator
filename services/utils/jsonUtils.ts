import { Logger } from '../logger';

export const cleanAndParseJSON = (text: string | undefined): Record<string, unknown> => {
  if (text === undefined) return {};
  try {
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText) as Record<string, unknown>;
  } catch {
    Logger.error('Parser', 'JSON Parse Error', { text });
    return {};
  }
};
