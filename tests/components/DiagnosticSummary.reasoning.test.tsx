import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';

import { setupGlobalMocks, mockAgentDBSpy } from './DiagnosticSummary.setup';

import type { AnalysisResult } from '../../types';

interface ExtendedAnalysisResult extends AnalysisResult {
  differential_diagnosis?: string[];
  riskAssessment?: string;
  reasoning?: string;
  riskEngine?: string;
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

describe('DiagnosticSummary Differential Diagnosis', () => {
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

  it('renders differential diagnosis when present', () => {
    const resultWithDifferential: ExtendedAnalysisResult = {
      ...mockResult,
      differential_diagnosis: ['Melanoma', 'Basal Cell Carcinoma', 'Squamous Cell Carcinoma'],
    };
    render(<DiagnosticSummary result={resultWithDifferential} />);
    expect(screen.getByText('Differential Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Melanoma')).toBeInTheDocument();
    expect(screen.getByText('Basal Cell Carcinoma')).toBeInTheDocument();
    expect(screen.getByText('Squamous Cell Carcinoma')).toBeInTheDocument();
  });

  it('does not render differential diagnosis when absent', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.queryByText('Differential Diagnosis')).not.toBeInTheDocument();
  });

  it('does not render differential diagnosis when empty array', () => {
    const resultWithEmptyDifferential: ExtendedAnalysisResult = {
      ...mockResult,
      differential_diagnosis: [],
    };
    render(<DiagnosticSummary result={resultWithEmptyDifferential} />);
    expect(screen.queryByText('Differential Diagnosis')).not.toBeInTheDocument();
  });
});

describe('DiagnosticSummary Agent Reasoning', () => {
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

  it('displays risk assessment reasoning', () => {
    const resultWithReasoning: ExtendedAnalysisResult = {
      ...mockResult,
      riskAssessment: 'High risk detected due to irregular borders and color variation.',
    };
    render(<DiagnosticSummary result={resultWithReasoning} />);
    expect(screen.getByText('Agent Reasoning')).toBeInTheDocument();
    expect(
      screen.getByText(/High risk detected due to irregular borders and color variation/i),
    ).toBeInTheDocument();
  });

  it('displays reasoning field when riskAssessment is absent', () => {
    const resultWithReasoningField: ExtendedAnalysisResult = {
      ...mockResult,
      reasoning: 'Pigmented lesion with asymmetrical morphology.',
    };
    render(<DiagnosticSummary result={resultWithReasoningField} />);
    expect(screen.getByText(/Pigmented lesion with asymmetrical morphology/i)).toBeInTheDocument();
  });

  it('displays risk engine badge when present', () => {
    const resultWithEngine: ExtendedAnalysisResult = {
      ...mockResult,
      riskEngine: 'WebLLM SmolLM2',
    };
    render(<DiagnosticSummary result={resultWithEngine} />);
    expect(screen.getByText('WebLLM SmolLM2')).toBeInTheDocument();
  });

  it('does not display risk engine badge when absent', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.queryByText(/WebLLM/i)).not.toBeInTheDocument();
  });

  it('displays empty string when no reasoning available', () => {
    render(<DiagnosticSummary result={mockResult} />);
    const reasoningElement = screen.getByText('Agent Reasoning').closest('div');
    const quotedText = reasoningElement?.querySelector('p');
    expect(quotedText).toBeInTheDocument();
    expect(quotedText).toHaveTextContent(/""/);
  });
});
