export interface CalibrationResult {
  threshold: number;
  mode: 'standard' | 'safety';
  calibrated: boolean;
  safetyMargin: number;
  isLowConfidence: boolean;
  calibrationComplete: boolean;
  safetyCalibrated: boolean;
}

export interface SafetyCalibrationConfig {
  standardThreshold: number;
  safetyThreshold: number;
  maxSafetyMargin: number;
}

const DEFAULT_CONFIG: SafetyCalibrationConfig = {
  standardThreshold: 0.65,
  safetyThreshold: 0.50,
  maxSafetyMargin: 0.15
};

export function calibrateForConfidence(
  confidence: number,
  mode: 'standard' | 'safety' = 'standard',
  config: SafetyCalibrationConfig = DEFAULT_CONFIG
): CalibrationResult {
  const isLowConfidence = confidence < config.standardThreshold;
  const actualMode = isLowConfidence ? 'safety' : mode;
  
  const threshold = actualMode === 'standard' 
    ? config.standardThreshold 
    : config.safetyThreshold;
  
  const safetyMargin = actualMode === 'safety'
    ? Math.min(config.maxSafetyMargin, (config.standardThreshold - confidence) * 0.5)
    : 0;

  return {
    threshold,
    mode: actualMode,
    calibrated: true,
    safetyMargin: Math.round(safetyMargin * 100) / 100,
    isLowConfidence,
    calibrationComplete: true,
    safetyCalibrated: actualMode === 'safety'
  };
}
