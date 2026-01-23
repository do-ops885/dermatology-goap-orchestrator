import { describe, it, expect, beforeEach } from 'vitest';

import { RouterAgent } from '../../services/router';

import type { AnalysisIntent } from '../../services/router';

/**
 * Tests for RouterAgent
 * Validates routing logic and specialist selection
 */

describe('RouterAgent', () => {
  let router: RouterAgent;

  beforeEach(() => {
    router = RouterAgent.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = RouterAgent.getInstance();
      const instance2 = RouterAgent.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = RouterAgent.getInstance();
      const instance2 = RouterAgent.getInstance();

      // Both should route the same way
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result1 = instance1.route({ file: mockFile });
      const result2 = instance2.route({ file: mockFile });

      expect(result1).toBe(result2);
    });
  });

  describe('route', () => {
    describe('VISION_ANALYSIS routing', () => {
      it('should route to VISION_ANALYSIS when image file is provided', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should route to VISION_ANALYSIS for PNG files', () => {
        const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should route to VISION_ANALYSIS for WebP files', () => {
        const mockFile = new File(['test'], 'test.webp', { type: 'image/webp' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should route to VISION_ANALYSIS for image/gif', () => {
        const mockFile = new File(['test'], 'test.gif', { type: 'image/gif' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should route to VISION_ANALYSIS when action is "Verify Image" with file', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'text/plain' }); // Non-image type
        const result = router.route({ file: mockFile, action: 'Verify Image' });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should prioritize image file over other actions', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        const result = router.route({
          file: mockFile,
          action: 'Generate Recommendations',
          text: 'some text',
        });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should route to VISION_ANALYSIS even with text present', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        const result = router.route({
          file: mockFile,
          text: 'Analyze this lesion',
        });

        expect(result).toBe('VISION_ANALYSIS');
      });
    });

    describe('REPORT_GENERATION routing', () => {
      it('should route to REPORT_GENERATION when action is "Generate Recommendations"', () => {
        const result = router.route({ action: 'Generate Recommendations' });

        expect(result).toBe('REPORT_GENERATION');
      });

      it('should route to REPORT_GENERATION when action is "Assess Risk"', () => {
        const result = router.route({ action: 'Assess Risk' });

        expect(result).toBe('REPORT_GENERATION');
      });

      it('should route to REPORT_GENERATION with text context', () => {
        const result = router.route({
          action: 'Generate Recommendations',
          text: 'Patient history: ...',
        });

        expect(result).toBe('REPORT_GENERATION');
      });
    });

    describe('CONVERSATIONAL_QUERY routing', () => {
      it('should default to CONVERSATIONAL_QUERY when no specific context', () => {
        const result = router.route({});

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should route to CONVERSATIONAL_QUERY with only text', () => {
        const result = router.route({ text: 'What is melanoma?' });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should route to CONVERSATIONAL_QUERY for non-image files', () => {
        const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should route to CONVERSATIONAL_QUERY for PDF files', () => {
        const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should route to CONVERSATIONAL_QUERY for unknown actions', () => {
        const result = router.route({ action: 'Unknown Action' });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should route to CONVERSATIONAL_QUERY with text and unknown action', () => {
        const result = router.route({
          text: 'Tell me about skin cancer',
          action: 'Something else',
        });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty file with image type', () => {
        const mockFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should handle file with no extension but image type', () => {
        const mockFile = new File(['test'], 'noextension', { type: 'image/jpeg' });

        const result = router.route({ file: mockFile });

        expect(result).toBe('VISION_ANALYSIS');
      });

      it('should handle empty context object', () => {
        const result = router.route({});

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });

      it('should handle null values in context', () => {
        const result = router.route({
          file: undefined as unknown as File,
          text: undefined as unknown as string,
          action: undefined as unknown as string,
        });

        expect(result).toBe('CONVERSATIONAL_QUERY');
      });
    });
  });

  describe('getRequiredSpecialist', () => {
    it('should return Vision-Specialist-MobileNetV3 for VISION_ANALYSIS', () => {
      const specialist = router.getRequiredSpecialist('VISION_ANALYSIS');

      expect(specialist).toBe('Vision-Specialist-MobileNetV3');
    });

    it('should return Orchestrator-SmolLM2 for REPORT_GENERATION', () => {
      const specialist = router.getRequiredSpecialist('REPORT_GENERATION');

      expect(specialist).toBe('Orchestrator-SmolLM2');
    });

    it('should return Router-General for CONVERSATIONAL_QUERY', () => {
      const specialist = router.getRequiredSpecialist('CONVERSATIONAL_QUERY');

      expect(specialist).toBe('Router-General');
    });

    it('should return Router-General for unknown intent', () => {
      const specialist = router.getRequiredSpecialist('UNKNOWN' as AnalysisIntent);

      expect(specialist).toBe('Router-General');
    });
  });

  describe('Integration: Route to Specialist workflow', () => {
    it('should route image analysis and get correct specialist', () => {
      const mockFile = new File(['image data'], 'lesion.jpg', { type: 'image/jpeg' });

      const intent = router.route({ file: mockFile });
      const specialist = router.getRequiredSpecialist(intent);

      expect(intent).toBe('VISION_ANALYSIS');
      expect(specialist).toBe('Vision-Specialist-MobileNetV3');
    });

    it('should route report generation and get correct specialist', () => {
      const intent = router.route({ action: 'Generate Recommendations' });
      const specialist = router.getRequiredSpecialist(intent);

      expect(intent).toBe('REPORT_GENERATION');
      expect(specialist).toBe('Orchestrator-SmolLM2');
    });

    it('should route conversational query and get correct specialist', () => {
      const intent = router.route({ text: 'What are the symptoms?' });
      const specialist = router.getRequiredSpecialist(intent);

      expect(intent).toBe('CONVERSATIONAL_QUERY');
      expect(specialist).toBe('Router-General');
    });

    it('should handle complete analysis workflow routing', () => {
      // Step 1: Upload image -> Vision Analysis
      const mockFile = new File(['data'], 'skin.jpg', { type: 'image/jpeg' });
      const step1Intent = router.route({ file: mockFile });
      expect(step1Intent).toBe('VISION_ANALYSIS');
      expect(router.getRequiredSpecialist(step1Intent)).toBe('Vision-Specialist-MobileNetV3');

      // Step 2: After vision -> Risk Assessment
      const step2Intent = router.route({ action: 'Assess Risk' });
      expect(step2Intent).toBe('REPORT_GENERATION');
      expect(router.getRequiredSpecialist(step2Intent)).toBe('Orchestrator-SmolLM2');

      // Step 3: Generate recommendations
      const step3Intent = router.route({ action: 'Generate Recommendations' });
      expect(step3Intent).toBe('REPORT_GENERATION');
      expect(router.getRequiredSpecialist(step3Intent)).toBe('Orchestrator-SmolLM2');
    });
  });
});
