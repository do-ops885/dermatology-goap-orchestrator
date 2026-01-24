import { describe, it, expect } from 'vitest';

import { ValidationService } from '../../services/validation';

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
