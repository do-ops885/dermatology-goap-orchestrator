import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger } from '../../../services/logger';
import { cleanAndParseJSON } from '../../../services/utils/jsonUtils';

// Mock the Logger
vi.mock('../../../services/logger', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

describe('jsonUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanAndParseJSON', () => {
    it('should return empty object for undefined input', () => {
      const result = cleanAndParseJSON(undefined);
      expect(result).toEqual({});
    });

    it('should parse clean JSON string', () => {
      const input = '{"name": "test", "value": 123}';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should remove markdown code fence with json prefix', () => {
      const input = '```json\n{"name": "test"}\n```';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should remove markdown code fence without newline', () => {
      const input = '```json{"name": "test"}```';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should handle only opening code fence', () => {
      const input = '```json\n{"name": "test"}';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should handle only closing code fence', () => {
      const input = '{"name": "test"}\n```';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should trim whitespace from input', () => {
      const input = '   {"name": "test"}   ';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should handle nested objects', () => {
      const input = '{"outer": {"inner": "value"}}';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ outer: { inner: 'value' } });
    });

    it('should handle arrays', () => {
      const input = '{"items": [1, 2, 3]}';
      const result = cleanAndParseJSON(input);
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should return empty object for invalid JSON and log error', () => {
      const invalidInput = '{invalid json}';
      const result = cleanAndParseJSON(invalidInput);

      expect(result).toEqual({});
      expect(Logger.error).toHaveBeenCalledWith('Parser', 'JSON Parse Error', {
        text: invalidInput,
      });
    });

    it('should handle empty string', () => {
      const result = cleanAndParseJSON('');
      expect(result).toEqual({});
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON after cleaning', () => {
      const input = '```json\n{malformed}\n```';
      const result = cleanAndParseJSON(input);

      expect(result).toEqual({});
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
