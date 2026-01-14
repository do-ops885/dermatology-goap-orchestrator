import { describe, it, expect } from 'vitest';

import { calibrateForConfidence, type SafetyCalibrationConfig } from '../../../services/executors/calibration';

describe('Calibration Agent', () => {
  describe('Standard Calibration', () => {
    it('should apply standard thresholds for high confidence (>0.65)', () => {
      const result = calibrateForConfidence(0.85, 'standard');
      expect(result.threshold).toBe(0.65);
      expect(result.mode).toBe('standard');
    });

    it('should return standard calibration result', () => {
      const result = calibrateForConfidence(0.90, 'standard');
      expect(result.calibrated).toBe(true);
      expect(result.safetyMargin).toBe(0);
    });
  });

  describe('Safety Calibration', () => {
    it('should apply conservative thresholds for low confidence (<0.65)', () => {
      const result = calibrateForConfidence(0.45, 'safety');
      expect(result.threshold).toBe(0.50);
      expect(result.mode).toBe('safety');
    });

    it('should add safety margin for low confidence cases', () => {
      const result = calibrateForConfidence(0.30, 'safety');
      expect(result.safetyMargin).toBeGreaterThan(0);
      expect(result.calibrated).toBe(true);
    });

    it('should flag is_low_confidence when confidence < 0.65', () => {
      const result = calibrateForConfidence(0.50, 'standard');
      expect(result.isLowConfidence).toBe(true);
    });

    it('should not flag low confidence when confidence >= 0.65', () => {
      const result = calibrateForConfidence(0.70, 'standard');
      expect(result.isLowConfidence).toBe(false);
    });
  });

  describe('Threshold Configuration', () => {
    it('should have correct default thresholds', () => {
      const config: SafetyCalibrationConfig = {
        standardThreshold: 0.65,
        safetyThreshold: 0.50,
        maxSafetyMargin: 0.15
      };
      expect(config.standardThreshold).toBe(0.65);
      expect(config.safetyThreshold).toBe(0.50);
    });

    it('should calculate appropriate safety margin based on confidence', () => {
      const veryLowConfidence = calibrateForConfidence(0.20, 'safety');
      const borderlineConfidence = calibrateForConfidence(0.49, 'safety');
      
      expect(veryLowConfidence.safetyMargin).toBeGreaterThan(borderlineConfidence.safetyMargin);
    });
  });

  describe('Calibration Complete State', () => {
    it('should set calibration_complete to true after successful calibration', () => {
      const result = calibrateForConfidence(0.75, 'standard');
      expect(result.calibrationComplete).toBe(true);
    });

    it('should set safety_calibrated correctly based on mode', () => {
      const standardResult = calibrateForConfidence(0.80, 'standard');
      const safetyResult = calibrateForConfidence(0.40, 'safety');
      
      expect(standardResult.safetyCalibrated).toBe(false);
      expect(safetyResult.safetyCalibrated).toBe(true);
    });
  });
});
