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

describe('DiagnosticSummary Container Styling and Transitions', () => {
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

  it('applies proper CSS classes when result is present', () => {
    const { container, } = render(<DiagnosticSummary result={mockResult} />,);
    const panel = container.querySelector('.glass-panel',);
    expect(panel,).toBeInTheDocument();
    expect(panel,).toHaveClass('opacity-100',);
    expect(panel,).toHaveClass('scale-100',);
  },);

  it('applies disabled CSS classes when result is null', () => {
    const { container, } = render(<DiagnosticSummary result={null} />,);
    const panel = container.querySelector('.glass-panel',);
    expect(panel,).toBeInTheDocument();
    expect(panel,).toHaveClass('opacity-40',);
    expect(panel,).toHaveClass('scale-95',);
    expect(panel,).toHaveClass('pointer-events-none',);
  },);
},);

describe('DiagnosticSummary Accessibility', () => {
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

  it('renders with proper heading structure', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    const heading = screen.getByRole('heading', { name: 'Diagnostic Summary', },);
    expect(heading,).toBeInTheDocument();
  },);

  it('provides accessible feedback button', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    const feedbackBtn = screen.getByRole('button', { name: /provide feedback/i, },);
    expect(feedbackBtn,).toBeInTheDocument();
  },);

  it('provides accessible export button', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    const exportBtn = screen.getByRole('button', { name: /export encrypted report/i, },);
    expect(exportBtn,).toBeInTheDocument();
  },);

  it('provides accessible external links', () => {
    render(<DiagnosticSummary result={mockResult} />,);
    const link = screen.getByRole('link', { name: 'Clinical Guideline 1', },);
    expect(link,).toBeInTheDocument();
    expect(link,).toHaveAttribute('target', '_blank',);
    expect(link,).toHaveAttribute('rel', 'noopener noreferrer',);
  },);
},);
