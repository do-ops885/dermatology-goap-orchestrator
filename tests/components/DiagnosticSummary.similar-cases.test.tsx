import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';

import { setupGlobalMocks, mockAgentDBSpy } from './DiagnosticSummary.setup';

import type { AnalysisResult } from '../../types';

interface ExtendedAnalysisResult extends AnalysisResult {
  similarCases?: Array<{
    outcome?: string;
    context?: string;
    taskType?: string;
    score?: number;
  }>;
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

describe('DiagnosticSummary Similar Cases', () => {
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

  it('renders similar cases when present', () => {
    const resultWithSimilarCases: ExtendedAnalysisResult = {
      ...mockResult,
      similarCases: [
        {
          outcome: 'Melanoma Confirmed',
          context: 'Patient with similar lesion morphology',
          taskType: 'Melanoma Detection',
          score: 0.92,
        },
        {
          outcome: 'Benign Nevi',
          context: 'Younger patient, sun-exposed area',
          score: 0.75,
        },
      ],
    };
    render(<DiagnosticSummary result={resultWithSimilarCases} />);
    expect(screen.getByText('Similar Clinical Patterns')).toBeInTheDocument();
    expect(screen.getByText('Melanoma Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Benign Nevi')).toBeInTheDocument();
    expect(screen.getByText('Sim: 92%')).toBeInTheDocument();
    expect(screen.getByText('Sim: 75%')).toBeInTheDocument();
  });

  it('does not render similar cases when absent', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.queryByText('Similar Clinical Patterns')).not.toBeInTheDocument();
  });

  it('displays fallback text when outcome is missing', () => {
    const resultWithFallbackCase: ExtendedAnalysisResult = {
      ...mockResult,
      similarCases: [
        {
          score: 0.85,
          context: 'Generic skin lesion',
          taskType: 'General Diagnosis',
        },
      ],
    };
    render(<DiagnosticSummary result={resultWithFallbackCase} />);
    expect(screen.getByText('Match Found')).toBeInTheDocument();
  });

  it('displays context when available', () => {
    const resultWithContext: ExtendedAnalysisResult = {
      ...mockResult,
      similarCases: [
        {
          outcome: 'Test Outcome',
          context: 'Sun-damaged skin, back region, irregular borders',
          score: 0.9,
        },
      ],
    };
    render(<DiagnosticSummary result={resultWithContext} />);
    expect(screen.getByText('Sun-damaged skin')).toBeInTheDocument();
  });

  it('displays task type when context is missing', () => {
    const resultWithTaskType: ExtendedAnalysisResult = {
      ...mockResult,
      similarCases: [
        {
          outcome: 'Test Outcome',
          taskType: 'Melanoma Detection',
          score: 0.88,
        },
      ],
    };
    render(<DiagnosticSummary result={resultWithTaskType} />);
    expect(screen.getByText('Melanoma Detection')).toBeInTheDocument();
  });
});
