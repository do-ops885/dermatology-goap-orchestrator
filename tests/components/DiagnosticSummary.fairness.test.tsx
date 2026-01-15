import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';

import { setupGlobalMocks, mockAgentDBSpy } from './DiagnosticSummary.setup';

import type { AnalysisResult } from '../../types';

interface ExtendedAnalysisResult extends AnalysisResult {
  fairness?: number;
}

const mockResult: AnalysisResult = {
  id: 'test-id',
  timestamp: 123456789,
  fitzpatrickType: 'III',
  lesions: [{ type: 'Melanoma', confidence: 0.85, risk: 'High' }],
  fairnessMetrics: { tpr: 0.9, fpr: 0.1, calibrationError: 0.05 },
  recommendations: ['See a doctor immediately.'],
  signature: 'sig-123',
  webVerification: {
    verified: true,
    sources: [
      {
        title: 'Clinical Guideline 1',
        uri: 'https://example.com/guideline1',
      },
    ],
    summary: 'Verified online according to clinical guidelines.',
  },
  securityContext: {
    encrypted: true,
    algorithm: 'AES-GCM',
    timestamp: 123,
    iv: [1, 2, 3],
    payloadSize: 100,
  },
};

describe('DiagnosticSummary Fairness Card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('displays fairness score with default fallback', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('displays fairness score from result when available', () => {
    const resultWithFairness: ExtendedAnalysisResult = {
      ...mockResult,
      fairness: 0.88,
    };
    render(<DiagnosticSummary result={resultWithFairness} />);
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('shows "Bias Invariant" badge', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText(/Bias Invariant/i)).toBeInTheDocument();
  });
});

describe('DiagnosticSummary Different Skin Tones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const fitzpatrickTypes: AnalysisResult['fitzpatrickType'][] = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  fitzpatrickTypes.forEach((type) => {
    it(`renders correctly for Fitzpatrick type ${type}`, () => {
      const resultWithType = { ...mockResult, fitzpatrickType: type };
      render(<DiagnosticSummary result={resultWithType} />);
      expect(screen.getByText(`Type ${type}`)).toBeInTheDocument();
    });
  });
});

describe('DiagnosticSummary Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles result with all optional fields undefined', () => {
    const minimalResult: AnalysisResult = {
      id: 'minimal-id',
      timestamp: 123,
      fitzpatrickType: 'I',
      lesions: [],
      fairnessMetrics: { tpr: 0, fpr: 0, calibrationError: 0 },
      recommendations: [],
      signature: '',
    };
    render(<DiagnosticSummary result={minimalResult} />);
    expect(screen.getByText('Type I')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('handles very long recommendation text', () => {
    const longRecommendation = 'This is a very long recommendation. '.repeat(10);
    const resultWithLongRec = {
      ...mockResult,
      recommendations: [longRecommendation],
    };
    render(<DiagnosticSummary result={resultWithLongRec} />);
    expect(screen.getByText(/This is a very long recommendation/)).toBeInTheDocument();
  });

  it('handles special characters in recommendations', () => {
    const specialRec = "Take medication < 3x daily. Consult Dr. O'Connor (M.D.). Cost: $500+";
    const resultWithSpecialRec = {
      ...mockResult,
      recommendations: [specialRec],
    };
    render(<DiagnosticSummary result={resultWithSpecialRec} />);
    expect(screen.getByText(/Take medication/)).toBeInTheDocument();
  });
});
