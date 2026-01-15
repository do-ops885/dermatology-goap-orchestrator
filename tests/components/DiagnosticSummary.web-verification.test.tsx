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

describe('DiagnosticSummary Web Verification', () => {
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

  it('renders web verification with sources', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('Web Verification (Gemini Grounding)')).toBeInTheDocument();
    expect(screen.getByText('Clinical Guideline 1')).toBeInTheDocument();
    expect(
      screen.getByText(/Verified online according to clinical guidelines/i),
    ).toBeInTheDocument();
  });

  it('renders multiple sources', () => {
    const resultWithMultipleSources: AnalysisResult = {
      ...mockResult,
      webVerification: {
        verified: true,
        sources: [
          { title: 'Guideline 1', uri: 'https://example.com/1' },
          { title: 'Guideline 2', uri: 'https://example.com/2' },
          { title: 'Guideline 3', uri: 'https://example.com/3' },
        ],
        summary: 'Multiple guidelines support this diagnosis.',
      },
    };
    render(<DiagnosticSummary result={resultWithMultipleSources} />);
    expect(screen.getByText('Guideline 1')).toBeInTheDocument();
    expect(screen.getByText('Guideline 2')).toBeInTheDocument();
    expect(screen.getByText('Guideline 3')).toBeInTheDocument();
  });

  it('shows no sources message when sources array is empty', () => {
    const resultWithNoSources: AnalysisResult = {
      ...mockResult,
      webVerification: {
        verified: true,
        sources: [],
        summary: 'No direct guidelines found.',
      },
    };
    render(<DiagnosticSummary result={resultWithNoSources} />);
    expect(screen.getByText('No direct guidelines found.')).toBeInTheDocument();
  });

  it('renders source link with correct attributes', () => {
    render(<DiagnosticSummary result={mockResult} />);
    const link = screen.getByText('Clinical Guideline 1');
    expect(link).toHaveAttribute('href');
    expect(link.getAttribute('href')).toContain('guideline1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render web verification when webVerification is undefined', () => {
    const { webVerification, ...resultNoWebVerification } = mockResult;
    render(<DiagnosticSummary result={resultNoWebVerification as AnalysisResult} />);
    expect(screen.queryByText('Web Verification')).not.toBeInTheDocument();
  });

  it('truncates summary to 150 characters', () => {
    const longSummary = 'A'.repeat(300);
    const resultWithLongSummary: AnalysisResult = {
      ...mockResult,
      webVerification: {
        verified: true,
        sources: [],
        summary: longSummary,
      },
    };
    render(<DiagnosticSummary result={resultWithLongSummary} />);
    const summaryElement = screen.getByText(/Verified online/i);
    expect(summaryElement.textContent).toMatch(/...$/);
    expect(summaryElement.textContent!.length).toBeLessThan(300);
  });
});

describe('DiagnosticSummary Recommendations', () => {
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

  it('displays recommendation from array', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText(/See a doctor immediately/i)).toBeInTheDocument();
  });

  it('displays fallback message when recommendations array is empty', () => {
    const resultWithEmptyRecommendations: AnalysisResult = {
      ...mockResult,
      recommendations: [],
    };
    render(<DiagnosticSummary result={resultWithEmptyRecommendations} />);
    expect(
      screen.getByText(/Consult a healthcare professional for follow-up/i),
    ).toBeInTheDocument();
  });

  it('displays multiple recommendations (only first one shown)', () => {
    const resultWithMultipleRecommendations: AnalysisResult = {
      ...mockResult,
      recommendations: ['First recommendation', 'Second recommendation', 'Third recommendation'],
    };
    render(<DiagnosticSummary result={resultWithMultipleRecommendations} />);
    expect(screen.getByText('First recommendation')).toBeInTheDocument();
    expect(screen.queryByText('Second recommendation')).not.toBeInTheDocument();
    expect(screen.queryByText('Third recommendation')).not.toBeInTheDocument();
  });

  it('displays recommendation text wrapped in quotes', () => {
    render(<DiagnosticSummary result={mockResult} />);
    const recommendationElement = screen.getByText(/See a doctor immediately/i);
    expect(recommendationElement.textContent).toMatch(/^"See a doctor/);
  });
});

describe('DiagnosticSummary Security Footer', () => {
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

  it('displays security footer when securityContext is present', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('Ephem-Key: Active')).toBeInTheDocument();
    expect(screen.getByText(/IV:/)).toBeInTheDocument();
  });

  it('truncates IV to first 4 elements', () => {
    const resultWithLongIV: AnalysisResult = {
      ...mockResult,
      securityContext: {
        ...mockResult.securityContext!,
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
    };
    render(<DiagnosticSummary result={resultWithLongIV} />);
    const ivElement = screen.getByText(/IV:/);
    expect(ivElement.textContent).toMatch(/IV: 123.../);
  });

  it('does not render security footer when securityContext is undefined', () => {
    const resultNoSecurity = { ...mockResult, securityContext: undefined };
    render(<DiagnosticSummary result={resultNoSecurity} />);
    expect(screen.queryByText('Ephem-Key: Active')).not.toBeInTheDocument();
  });
});
