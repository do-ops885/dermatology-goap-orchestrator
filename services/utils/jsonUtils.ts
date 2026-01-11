import { Logger } from './logger';

export const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) return {};
  try {
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    Logger.error('Parser', 'JSON Parse Error', { text });
    return {};
  }
};
