import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';

import { setupGlobalMocks, mockAgentDBSpy } from './DiagnosticSummary.setup';

import type { AnalysisResult } from '../../types';

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

describe('DiagnosticSummary Classification Card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();,
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();,
  });

  it('displays Fitzpatrick type correctly', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('Type III')).toBeInTheDocument();,
  });

  it('displays confidence percentage correctly for high confidence', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('85.0%')).toBeInTheDocument();,
  });

  it('shows green color for high confidence (>= 0.65)', () => {
    render(<DiagnosticSummary result={mockResult} />);
    const confidenceElement = screen.getByText('85.0%');
    expect(confidenceElement).toHaveClass('text-green-600');,
  });

  it('shows amber color for low confidence (< 0.65)', () => {
    const lowConfidenceResult = {
      ...mockResult,
      lesions: [{ type: 'Basal Cell Carcinoma', confidence: 0.5, risk: 'Medium' as const }],
    };
    render(<DiagnosticSummary result={lowConfidenceResult} />);
    const confidenceElement = screen.getByText('50.0%');
    expect(confidenceElement).toHaveClass('text-amber-600');,
  });

  it('handles missing lesion array gracefully', () => {
    const noLesionResult = { ...mockResult, lesions: [] };
    render(<DiagnosticSummary result={noLesionResult} />);
    expect(screen.getByText('Type III')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();,
  });,
});

describe('DiagnosticSummary Different Lesion Types and Risk Levels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();,
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();,
  });

  it('displays Basal Cell Carcinoma correctly', () => {
    const bccResult = {
      ...mockResult,
      lesions: [{ type: 'Basal Cell Carcinoma', confidence: 0.72, risk: 'Medium' as const }],
    };
    render(<DiagnosticSummary result={bccResult} />);
    expect(screen.getByText('72.0%')).toBeInTheDocument();,
  });

  it('displays Squamous Cell Carcinoma correctly', () => {
    const sccResult = {
      ...mockResult,
      lesions: [{ type: 'Squamous Cell Carcinoma', confidence: 0.68, risk: 'Medium' as const }],
    };
    render(<DiagnosticSummary result={sccResult} />);
    expect(screen.getByText('68.0%')).toBeInTheDocument();,
  });

  it('handles Low risk level', () => {
    const lowRiskResult = {
      ...mockResult,
      lesions: [{ type: 'Benign Nevi', confidence: 0.92, risk: 'Low' as const }],
    };
    render(<DiagnosticSummary result={lowRiskResult} />);
    expect(screen.getByText('92.0%')).toBeInTheDocument();
    expect(screen.getByText('92.0%')).toHaveClass('text-green-600');,
  });

  it('handles High risk level', () => {
    const highRiskResult = {
      ...mockResult,
      lesions: [{ type: 'Melanoma', confidence: 0.78, risk: 'High' as const }],
    };
    render(<DiagnosticSummary result={highRiskResult} />);
    expect(screen.getByText('78.0%')).toBeInTheDocument();,
  });

  it('handles extremely high confidence score', () => {
    const highConfidenceResult = {
      ...mockResult,
      lesions: [{ type: 'Melanoma', confidence: 1.0, risk: 'High' as const }],
    };
    render(<DiagnosticSummary result={highConfidenceResult} />);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toHaveClass('text-green-600');,
  });

  it('handles zero confidence score', () => {
    const zeroConfidenceResult = {
      ...mockResult,
      lesions: [{ type: 'Melanoma', confidence: 0.0, risk: 'Low' as const }],
    };
    render(<DiagnosticSummary result={zeroConfidenceResult} />);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toHaveClass('text-amber-600');,
  });,
});
