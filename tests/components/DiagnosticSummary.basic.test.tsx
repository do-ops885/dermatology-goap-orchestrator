import { render, screen, } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, } from 'vitest';

import { DiagnosticSummary, } from '../../components/DiagnosticSummary';

import { setupGlobalMocks, mockAgentDBSpy, } from './DiagnosticSummary.setup';

import type { AnalysisResult, } from '../../types';

const mockResult: AnalysisResult = {
  id: 'test-id',
  timestamp: 123456789,
  fitzpatrickType: 'III',
  lesions: [{ type: 'Melanoma', confidence: 0.85, risk: 'High', },],
  fairnessMetrics: { tpr: 0.9, fpr: 0.1, calibrationError: 0.05, },
  recommendations: ['See a doctor immediately.',],
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
    iv: [1, 2, 3,],
    payloadSize: 100,
  },
};

describe('DiagnosticSummary Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();
  },);

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  },);

  it('renders idle state when result is null', () => {
    render(<DiagnosticSummary result={null} />,);
    expect(screen.getByText('Orchestrator idle',),).toBeInTheDocument();
  },);

  it('renders idle state with proper styling', () => {
    const { container, } = render(<DiagnosticSummary result={null} />,);
    const gaugeIcon = container.querySelector('svg',);
    expect(gaugeIcon,).toBeInTheDocument();
    expect(container.querySelector('.text-stone-300',),).toBeInTheDocument();
  },);
},);

describe('DiagnosticSummary Header and Security Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupGlobalMocks();
    mockAgentDBSpy();
  },);

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  },);

  it('renders header with title and subtitle', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    expect(screen.getByText('Diagnostic Summary',),).toBeInTheDocument();
    expect(screen.getByText('FairDisCo Disentangled',),).toBeInTheDocument();
  },);

  it('shows SECURED badge when encrypted', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    expect(screen.getByText('SECURED',),).toBeInTheDocument();
  },);

  it('shows lock icon without SECURED text when not encrypted', () => {
    const unencryptedResult = {
      ...mockResult,
      securityContext: {
        ...mockResult.securityContext!,
        encrypted: false,
      },
    };
    const { container, } = render(<DiagnosticSummary result={unencryptedResult} />,);
    expect(screen.queryByText('SECURED',),).not.toBeInTheDocument();
    const lockIcon = container.querySelector('.lucide-lock',);
    expect(lockIcon,).toBeInTheDocument();
  },);

  it('shows lock icon when securityContext is undefined', () => {
    const resultNoSecurity = { ...mockResult, securityContext: undefined, };
    const { container, } = render(<DiagnosticSummary result={resultNoSecurity} />,);
    const lockIcon = container.querySelector('.lucide-lock',);
    expect(lockIcon,).toBeInTheDocument();
  },);
},);
