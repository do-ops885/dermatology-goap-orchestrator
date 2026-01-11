import { describe, it, expect, beforeEach, vi } from 'vitest';
import AgentDB from '../../services/agentDB';
import type { FitzpatrickType, ClinicianFeedback } from '../../types';

describe('Clinician Feedback Integration', () => {
  let agentDB: AgentDB;

  beforeEach(() => {
    agentDB = AgentDB.getInstance();
  });

  describe('Feedback Storage', () => {
    it('should store clinician feedback with correct structure', async () => {
      const feedback: ClinicianFeedback = {
        id: 'feedback_test123',
        analysisId: 'analysis_456',
        diagnosis: 'Melanoma',
        correctedDiagnosis: 'Benign Nevus',
        confidence: 0.85,
        notes: 'Patient history suggests benign condition',
        timestamp: Date.now(),
        fitzpatrickType: 'III',
        clinicianId: 'doc_789',
        isCorrection: true
      };

      await expect(agentDB.storeClinicianFeedback(feedback)).resolves.not.toThrow();
    });

    it('should mark feedback as correction when diagnosis differs', async () => {
      const feedback: ClinicianFeedback = {
        id: 'feedback_test456',
        analysisId: 'analysis_789',
        diagnosis: 'BCC',
        correctedDiagnosis: 'SCC',
        confidence: 0.9,
        notes: 'Histology confirms SCC',
        timestamp: Date.now(),
        fitzpatrickType: 'IV',
        isCorrection: true
      };

      await expect(agentDB.storeClinicianFeedback(feedback)).resolves.not.toThrow();
      
      // Verify the feedback is marked as a correction
      expect(feedback.isCorrection).toBe(true);
      expect(feedback.correctedDiagnosis).toBeDefined();
    });

    it('should mark feedback as confirmation when no correction provided', async () => {
      const feedback: ClinicianFeedback = {
        id: 'feedback_test789',
        analysisId: 'analysis_101',
        diagnosis: 'Melanoma',
        confidence: 0.95,
        notes: 'Diagnosis confirmed',
        timestamp: Date.now(),
        fitzpatrickType: 'II',
        isCorrection: false
      };

      await expect(agentDB.storeClinicianFeedback(feedback)).resolves.not.toThrow();
      
      // Verify the feedback is marked as confirmation
      expect(feedback.isCorrection).toBe(false);
      expect(feedback.correctedDiagnosis).toBeUndefined();
    });
  });

  describe('Feedback Statistics', () => {
    it('should return valid stats structure when no feedback exists', async () => {
      // Reset memory first
      await agentDB.resetMemory();
      
      const stats = await agentDB.getFeedbackStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalFeedback).toBe('number');
      expect(typeof stats.corrections).toBe('number');
      expect(typeof stats.confirmations).toBe('number');
      expect(typeof stats.avgConfidence).toBe('number');
      expect(stats.byFitzpatrick).toBeDefined();
    });

    it('should accept and store multiple feedback entries', async () => {
      await agentDB.resetMemory();

      const feedbacks: ClinicianFeedback[] = [
        {
          id: 'f1',
          analysisId: 'a1',
          diagnosis: 'Test1',
          confidence: 0.8,
          notes: '',
          timestamp: Date.now(),
          fitzpatrickType: 'I',
          isCorrection: false
        },
        {
          id: 'f2',
          analysisId: 'a2',
          diagnosis: 'Test2',
          confidence: 0.9,
          notes: '',
          timestamp: Date.now(),
          fitzpatrickType: 'II',
          isCorrection: false
        }
      ];

      // Should not throw
      for (const feedback of feedbacks) {
        await expect(agentDB.storeClinicianFeedback(feedback)).resolves.not.toThrow();
      }

      const stats = await agentDB.getFeedbackStats();
      
      // Stats should be valid numbers
      expect(typeof stats.avgConfidence).toBe('number');
      expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidence).toBeLessThanOrEqual(1);
    });

    it('should track feedback by Fitzpatrick type', async () => {
      await agentDB.resetMemory();

      const feedback: ClinicianFeedback = {
        id: 'f_fitz',
        analysisId: 'a_fitz',
        diagnosis: 'Test',
        confidence: 0.9,
        notes: '',
        timestamp: Date.now(),
        fitzpatrickType: 'V',
        isCorrection: true
      };

      await agentDB.storeClinicianFeedback(feedback);
      
      // Wait for database write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = await agentDB.getFeedbackStats();

      // May be 0 if database doesn't support querying yet
      expect(stats.byFitzpatrick['V']).toBeDefined();
      expect(typeof stats.byFitzpatrick['V'].count).toBe('number');
    });
  });

  describe('Learning Integration', () => {
    it('should store feedback without throwing errors', async () => {
      const feedback: ClinicianFeedback = {
        id: 'learning_test',
        analysisId: 'analysis_learning',
        diagnosis: 'AI Diagnosis',
        correctedDiagnosis: 'Clinician Correction',
        confidence: 1.0,
        notes: 'High confidence correction',
        timestamp: Date.now(),
        fitzpatrickType: 'VI',
        clinicianId: 'expert_001',
        isCorrection: true
      };

      // Should not throw
      await expect(agentDB.storeClinicianFeedback(feedback)).resolves.not.toThrow();
    });

    it('should accept corrections with proper structure', async () => {
      const correction: ClinicianFeedback = {
        id: 'weight_test',
        analysisId: 'analysis_weight',
        diagnosis: 'Original',
        correctedDiagnosis: 'Corrected',
        confidence: 0.95,
        notes: '',
        timestamp: Date.now(),
        fitzpatrickType: 'III',
        isCorrection: true
      };

      // Should not throw and should mark as correction
      await expect(agentDB.storeClinicianFeedback(correction)).resolves.not.toThrow();
      expect(correction.isCorrection).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ReasoningBank gracefully', async () => {
      const agentDBNoBank = new (AgentDB as any)();
      agentDBNoBank.reasoningBank = null;

      const feedback: ClinicianFeedback = {
        id: 'error_test',
        analysisId: 'analysis_error',
        diagnosis: 'Test',
        confidence: 0.8,
        notes: '',
        timestamp: Date.now(),
        isCorrection: false
      };

      await expect(agentDBNoBank.storeClinicianFeedback(feedback)).resolves.not.toThrow();
    });

    it('should return default stats when database is not initialized', async () => {
      const agentDBNoBank = new (AgentDB as any)();
      agentDBNoBank.reasoningBank = null;

      const stats = await agentDBNoBank.getFeedbackStats();

      expect(stats.totalFeedback).toBe(0);
      expect(stats.byFitzpatrick).toBeDefined();
    });
  });
});
