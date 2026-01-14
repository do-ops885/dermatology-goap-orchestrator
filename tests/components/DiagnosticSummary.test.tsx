import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';

import type { AnalysisResult } from '../../types';

describe('DiagnosticSummary', () => {
  const mockResult: AnalysisResult = {
    id: 'test-id',
    timestamp: 123456789,
    fitzpatrickType: 'III',
    lesions: [{ type: 'Melanoma', confidence: 0.85, risk: 'High' }],
    fairnessMetrics: { tpr: 0.9, fpr: 0.1, calibrationError: 0.05 },
    recommendations: ['See a doctor immediately.'],
    signature: 'sig-123',
    webVerification: { verified: true, sources: [], summary: 'Verified online.' },
    securityContext: {
      encrypted: true,
      algorithm: 'AES-GCM',
      timestamp: 123,
      iv: [1, 2, 3],
      payloadSize: 100,
    },
  };

  it('renders idle state when no result', () => {
    render(<DiagnosticSummary result={null} />);
    expect(screen.getByText('Orchestrator idle')).toBeInTheDocument();
  });

  it('renders diagnosis details correctly', () => {
    render(<DiagnosticSummary result={mockResult} />);

    expect(screen.getByText('Type III')).toBeInTheDocument();
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('SECURED')).toBeInTheDocument();
    expect(screen.getByText('"See a doctor immediately."')).toBeInTheDocument();
  });

  it('triggers export logic on button click', () => {
    const createObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = vi.fn();

    render(<DiagnosticSummary result={mockResult} />);

    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    expect(createObjectURL).toHaveBeenCalled();
  });
});
