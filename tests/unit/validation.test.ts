import { describe, it, expect } from 'vitest';

import { ValidationService } from '../../services/validation';

describe('ValidationService', () => {
  describe('validateFileUpload', () => {
    it('should validate a correct file upload object', () => {
      const validFile = {
        name: 'test-image.jpg',
        type: 'image/jpeg' as const,
        size: 1024 * 1024,
        lastModified: Date.now(),
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('test-image.jpg');
        expect(result.data.type).toBe('image/jpeg');
        expect(result.data.size).toBe(1024 * 1024);
      }
    });

    it('should validate PNG files', () => {
      const validFile = {
        name: 'test-image.png',
        type: 'image/png' as const,
        size: 2 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
    });

    it('should validate WebP files', () => {
      const validFile = {
        name: 'test-image.webp',
        type: 'image/webp' as const,
        size: 3 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        name: 'test-image.gif',
        type: 'image/gif' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('type: Only JPEG, PNG, and WebP images are supported');
      }
    });

    it('should reject files exceeding 10MB limit', () => {
      const invalidFile = {
        name: 'large-image.jpg',
        type: 'image/jpeg' as const,
        size: 11 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('size: File size exceeds 10MB limit');
      }
    });

    it('should reject files with names exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const invalidFile = {
        name: `${longName}.jpg`,
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('name: File name too long');
      }
    });

    it('should reject files with invalid characters in name', () => {
      const invalidFile = {
        name: 'test/image.jpg',
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('name: Invalid file name format');
      }
    });

    it('should accept lastModified as optional', () => {
      const fileWithoutTimestamp = {
        name: 'test.jpg',
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(fileWithoutTimestamp);

      expect(result.success).toBe(true);
    });

    it('should return multiple errors for multiple validation failures', () => {
      const invalidFile = {
        name: 'a'.repeat(256),
        type: 'image/gif' as const,
        size: 15 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('validateWorldState', () => {
    it('should validate a correct world state object', () => {
      const validWorldState = {
        image_verified: true,
        skin_tone_detected: true,
        fitzpatrick_type: 'III' as const,
        image_preprocessed: true,
        segmentation_complete: true,
        features_extracted: true,
        lesions_detected: true,
        fairness_validated: true,
        similarity_searched: true,
        risk_assessed: true,
        web_verified: true,
        recommendations_generated: true,
        learning_updated: true,
        data_encrypted: true,
        audit_logged: true,
        confidence_score: 0.85,
        fairness_score: 0.92,
        is_low_confidence: false,
        safety_calibrated: true,
        calibration_complete: true,
      };

      const result = ValidationService.validateWorldState(validWorldState);

      expect(result.success).toBe(true);
    });

    it('should accept null for fitzpatrick_type', () => {
      const stateNullFitzpatrick = {
        image_verified: false,
        skin_tone_detected: false,
        fitzpatrick_type: null,
        image_preprocessed: false,
        segmentation_complete: false,
        features_extracted: false,
        lesions_detected: false,
        fairness_validated: false,
        similarity_searched: false,
        risk_assessed: false,
        web_verified: false,
        recommendations_generated: false,
        learning_updated: false,
        data_encrypted: false,
        audit_logged: false,
        confidence_score: 0,
        fairness_score: 0,
        is_low_confidence: true,
        safety_calibrated: false,
        calibration_complete: false,
      };

      const result = ValidationService.validateWorldState(stateNullFitzpatrick);

      expect(result.success).toBe(true);
    });

    it('should accept all valid fitzpatrick types', () => {
      const fitzpatrickTypes: Array<'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'> = [
        'I',
        'II',
        'III',
        'IV',
        'V',
        'VI',
      ];

      for (const type of fitzpatrickTypes) {
        const state = {
          image_verified: true,
          skin_tone_detected: true,
          fitzpatrick_type: type,
          image_preprocessed: false,
          segmentation_complete: false,
          features_extracted: false,
          lesions_detected: false,
          fairness_validated: false,
          similarity_searched: false,
          risk_assessed: false,
          web_verified: false,
          recommendations_generated: false,
          learning_updated: false,
          data_encrypted: false,
          audit_logged: false,
          confidence_score: 0.5,
          fairness_score: 0.5,
          is_low_confidence: false,
          safety_calibrated: false,
          calibration_complete: false,
        };

        const result = ValidationService.validateWorldState(state);
        expect(result.success).toBe(true);
      }
    });

    it('should validate confidence_score range (0-1)', () => {
      const stateZero = {
        image_verified: true,
        skin_tone_detected: false,
        fitzpatrick_type: null,
        image_preprocessed: false,
        segmentation_complete: false,
        features_extracted: false,
        lesions_detected: false,
        fairness_validated: false,
        similarity_searched: false,
        risk_assessed: false,
        web_verified: false,
        recommendations_generated: false,
        learning_updated: false,
        data_encrypted: false,
        audit_logged: false,
        confidence_score: 0,
        fairness_score: 0.5,
        is_low_confidence: false,
        safety_calibrated: false,
        calibration_complete: false,
      };

      const stateOne = {
        ...stateZero,
        confidence_score: 1,
      };

      expect(ValidationService.validateWorldState(stateZero).success).toBe(true);
      expect(ValidationService.validateWorldState(stateOne).success).toBe(true);
    });

    it('should reject confidence_score outside range', () => {
      const stateOutOfRange = {
        image_verified: true,
        skin_tone_detected: false,
        fitzpatrick_type: null,
        image_preprocessed: false,
        segmentation_complete: false,
        features_extracted: false,
        lesions_detected: false,
        fairness_validated: false,
        similarity_searched: false,
        risk_assessed: false,
        web_verified: false,
        recommendations_generated: false,
        learning_updated: false,
        data_encrypted: false,
        audit_logged: false,
        confidence_score: 1.5,
        fairness_score: 0.5,
        is_low_confidence: false,
        safety_calibrated: false,
        calibration_complete: false,
      };

      const result = ValidationService.validateWorldState(stateOutOfRange);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('confidence_score'))).toBe(true);
      }
    });

    it('should reject missing required fields', () => {
      const invalidState = {
        image_verified: true,
        confidence_score: 0.5,
      } as unknown;

      const result = ValidationService.validateWorldState(invalidState);

      expect(result.success).toBe(false);
    });

    it('should reject invalid fitzpatrick type', () => {
      const invalidState = {
        image_verified: true,
        skin_tone_detected: true,
        fitzpatrick_type: 'VII' as const,
        image_preprocessed: false,
        segmentation_complete: false,
        features_extracted: false,
        lesions_detected: false,
        fairness_validated: false,
        similarity_searched: false,
        risk_assessed: false,
        web_verified: false,
        recommendations_generated: false,
        learning_updated: false,
        data_encrypted: false,
        audit_logged: false,
        confidence_score: 0.5,
        fairness_score: 0.5,
        is_low_confidence: false,
        safety_calibrated: false,
        calibration_complete: false,
      };

      const result = ValidationService.validateWorldState(invalidState);

      expect(result.success).toBe(false);
    });
  });

  describe('validateConsentState', () => {
    it('should validate a correct consent state object', () => {
      const validConsent = {
        localProcessing: true,
        cloudGemini: false,
        offlineAnalysis: false,
        dataStorage: true,
        analytics: false,
        timestamp: Date.now(),
        userId: 'user-123',
      };

      const result = ValidationService.validateConsentState(validConsent);

      expect(result.success).toBe(true);
    });

    it('should apply default values for missing fields', () => {
      const partialConsent = {
        localProcessing: true,
      };

      const result = ValidationService.validateConsentState(partialConsent);

      expect(result.success).toBe(true);
    });

    it('should accept userId as optional', () => {
      const consentWithoutUser = {
        localProcessing: true,
        cloudGemini: true,
        offlineAnalysis: false,
        dataStorage: true,
        analytics: false,
      };

      const result = ValidationService.validateConsentState(consentWithoutUser);

      expect(result.success).toBe(true);
    });

    it('should require all fields to be boolean except timestamp and userId', () => {
      const invalidConsent = {
        localProcessing: 'true',
      } as unknown;

      const result = ValidationService.validateConsentState(invalidConsent);

      expect(result.success).toBe(false);
    });

    it('should accept valid timestamp', () => {
      const consentWithTimestamp = {
        localProcessing: true,
        timestamp: 1704067200000,
      };

      const result = ValidationService.validateConsentState(consentWithTimestamp);

      expect(result.success).toBe(true);
    });

    it('should reject negative timestamp', () => {
      const invalidConsent = {
        localProcessing: true,
        timestamp: -1,
      };

      const result = ValidationService.validateConsentState(invalidConsent);

      expect(result.success).toBe(false);
    });
  });

  describe('validateAnalysisResult', () => {
    it('should validate a complete analysis result', () => {
      const validResult = {
        id: 'analysis-123',
        timestamp: Date.now(),
        fitzpatrickType: 'III' as const,
        lesions: [
          {
            type: 'melanoma',
            confidence: 0.87,
            risk: 'High' as const,
          },
        ],
        fairnessMetrics: {
          tpr: 0.92,
          fpr: 0.08,
          calibrationError: 0.05,
        },
        recommendations: ['Schedule dermatologist appointment', 'Monitor for changes'],
        signature: 'abc123def456',
      };

      const result = ValidationService.validateAnalysisResult(validResult);

      expect(result.success).toBe(true);
    });

    it('should validate result with optional webVerification', () => {
      const resultWithWebVerification = {
        id: 'analysis-124',
        timestamp: Date.now(),
        fitzpatrickType: 'IV' as const,
        lesions: [
          {
            type: 'bcc',
            confidence: 0.75,
            risk: 'Medium' as const,
          },
        ],
        fairnessMetrics: {
          tpr: 0.88,
          fpr: 0.12,
          calibrationError: 0.06,
        },
        recommendations: ['Seek medical advice'],
        signature: 'xyz789',
        webVerification: {
          verified: true,
          sources: [
            {
              title: 'Medical Source 1',
              uri: 'https://example.com/medical',
            },
          ],
          summary: 'Verified against medical literature',
        },
      };

      const result = ValidationService.validateAnalysisResult(resultWithWebVerification);

      expect(result.success).toBe(true);
    });

    it('should validate result with optional securityContext', () => {
      const resultWithSecurity = {
        id: 'analysis-125',
        timestamp: Date.now(),
        fitzpatrickType: 'II' as const,
        lesions: [],
        fairnessMetrics: {
          tpr: 0.95,
          fpr: 0.05,
          calibrationError: 0.03,
        },
        recommendations: [],
        signature: 'signature123',
        securityContext: {
          encrypted: true,
          algorithm: 'AES-256-GCM',
          timestamp: Date.now(),
          iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          payloadSize: 1024,
        },
      };

      const result = ValidationService.validateAnalysisResult(resultWithSecurity);

      expect(result.success).toBe(true);
    });

    it('should validate result with optional clinicianFeedback', () => {
      const resultWithFeedback = {
        id: 'analysis-126',
        timestamp: Date.now(),
        fitzpatrickType: 'V' as const,
        lesions: [
          {
            type: 'unknown',
            confidence: 0.6,
            risk: 'Low' as const,
          },
        ],
        fairnessMetrics: {
          tpr: 0.9,
          fpr: 0.1,
          calibrationError: 0.04,
        },
        recommendations: ['Further examination needed'],
        signature: 'feedback123',
        clinicianFeedback: {
          id: 'feedback-123',
          analysisId: 'analysis-126',
          diagnosis: 'actinic keratosis',
          correctedDiagnosis: 'seborrheic keratosis',
          confidence: 0.95,
          notes: 'Patient has history of sun exposure',
          timestamp: Date.now(),
          fitzpatrickType: 'V' as const,
          clinicianId: 'clinician-456',
          isCorrection: true,
        },
      };

      const result = ValidationService.validateAnalysisResult(resultWithFeedback);

      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidResult = {
        id: 'analysis-127',
      } as unknown;

      const result = ValidationService.validateAnalysisResult(invalidResult);

      expect(result.success).toBe(false);
    });

    it('should reject lesion confidence outside 0-1 range', () => {
      const invalidResult = {
        id: 'analysis-128',
        timestamp: Date.now(),
        fitzpatrickType: 'III' as const,
        lesions: [
          {
            type: 'melanoma',
            confidence: 1.5,
            risk: 'High' as const,
          },
        ],
        fairnessMetrics: {
          tpr: 0.9,
          fpr: 0.1,
          calibrationError: 0.05,
        },
        recommendations: [],
        signature: 'sig123',
      };

      const result = ValidationService.validateAnalysisResult(invalidResult);

      expect(result.success).toBe(false);
    });

    it('should reject invalid risk level', () => {
      const invalidResult = {
        id: 'analysis-129',
        timestamp: Date.now(),
        fitzpatrickType: 'III' as const,
        lesions: [
          {
            type: 'melanoma',
            confidence: 0.8,
            risk: 'Very High' as const,
          },
        ],
        fairnessMetrics: {
          tpr: 0.9,
          fpr: 0.1,
          calibrationError: 0.05,
        },
        recommendations: [],
        signature: 'sig123',
      };

      const result = ValidationService.validateAnalysisResult(invalidResult);

      expect(result.success).toBe(false);
    });

    it('should validate fairness metrics are within valid ranges', () => {
      const resultWithBoundaryMetrics = {
        id: 'analysis-130',
        timestamp: Date.now(),
        fitzpatrickType: 'III' as const,
        lesions: [],
        fairnessMetrics: {
          tpr: 0,
          fpr: 1,
          calibrationError: 0.5,
        },
        recommendations: [],
        signature: 'sig123',
      };

      const result = ValidationService.validateAnalysisResult(resultWithBoundaryMetrics);

      expect(result.success).toBe(true);
    });

    it('should reject fairness metrics outside valid ranges', () => {
      const invalidResult = {
        id: 'analysis-131',
        timestamp: Date.now(),
        fitzpatrickType: 'III' as const,
        lesions: [],
        fairnessMetrics: {
          tpr: 1.5,
          fpr: -0.1,
          calibrationError: 1.2,
        },
        recommendations: [],
        signature: 'sig123',
      };

      const result = ValidationService.validateAnalysisResult(invalidResult);

      expect(result.success).toBe(false);
    });
  });

  describe('validatePIIRedactionOptions', () => {
    it('should validate correct PII redaction options', () => {
      const validOptions = {
        maskPhone: true,
        maskEmail: true,
        maskSSN: true,
        maskDOB: false,
        customPatterns: [/\d{3}-\d{3}-\d{4}/],
      };

      const result = ValidationService.validatePIIRedactionOptions(validOptions);

      expect(result.success).toBe(true);
    });

    it('should apply default values for missing fields', () => {
      const emptyOptions = {};

      const result = ValidationService.validatePIIRedactionOptions(emptyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maskPhone).toBe(true);
        expect(result.data.maskEmail).toBe(true);
        expect(result.data.maskSSN).toBe(true);
        expect(result.data.maskDOB).toBe(true);
      }
    });

    it('should accept customPatterns as optional', () => {
      const optionsWithoutCustom = {
        maskPhone: false,
        maskEmail: false,
      };

      const result = ValidationService.validatePIIRedactionOptions(optionsWithoutCustom);

      expect(result.success).toBe(true);
    });

    it('should reject non-boolean values', () => {
      const invalidOptions = {
        maskPhone: 'true',
      } as unknown;

      const result = ValidationService.validatePIIRedactionOptions(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject non-RegExp values in customPatterns array', () => {
      const invalidOptions = {
        customPatterns: ['pattern1', 'pattern2'],
      } as unknown;

      const result = ValidationService.validatePIIRedactionOptions(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should accept multiple custom regex patterns', () => {
      const validOptions = {
        customPatterns: [/\d{3}-\d{2}-\d{4}/, /@test\.com/, /\d{10}/],
      };

      const result = ValidationService.validatePIIRedactionOptions(validOptions);

      expect(result.success).toBe(true);
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle null input gracefully', () => {
      const fileResult = ValidationService.validateFileUpload(null);
      const worldStateResult = ValidationService.validateWorldState(null);
      const consentResult = ValidationService.validateConsentState(null);
      const analysisResult = ValidationService.validateAnalysisResult(null);
      const piiResult = ValidationService.validatePIIRedactionOptions(null);

      expect(fileResult.success).toBe(false);
      expect(worldStateResult.success).toBe(false);
      expect(consentResult.success).toBe(false);
      expect(analysisResult.success).toBe(false);
      expect(piiResult.success).toBe(false);
    });

    it('should handle undefined input gracefully', () => {
      const fileResult = ValidationService.validateFileUpload(undefined);
      expect(fileResult.success).toBe(false);
    });

    it('should handle empty objects', () => {
      const consentResult = ValidationService.validateConsentState({});
      const piiResult = ValidationService.validatePIIRedactionOptions({});

      expect(consentResult.success).toBe(true);
      expect(piiResult.success).toBe(true);
    });

    it('should provide detailed error messages', () => {
      const invalidFile = {
        name: 'test.gif',
        type: 'image/gif' as const,
        size: 15 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.every((error) => typeof error === 'string')).toBe(true);
      }
    });
  });
});
