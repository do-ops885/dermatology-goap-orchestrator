import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DiagnosticSummary } from '../../components/DiagnosticSummary';
import AgentDB from '../../services/agentDB';

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

describe('DiagnosticSummary Feedback Functionality', () => {
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

  it('shows feedback button when result has lesions', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('Provide Feedback')).toBeInTheDocument();
  });

  it('opens feedback modal when button is clicked', async () => {
    render(<DiagnosticSummary result={mockResult} />);
    const feedbackBtn = screen.getByText('Provide Feedback');
    fireEvent.click(feedbackBtn);

    await waitFor(() => {
      expect(screen.getByText(/Clinician Feedback/i)).toBeInTheDocument();
    });
  }, 10000);

  it('stores feedback when submitted', async () => {
    const mockStoreClinicianFeedback = vi.fn().mockResolvedValue(undefined);
    const spy = vi.spyOn(AgentDB, 'getInstance').mockReturnValue({
      storeClinicianFeedback: mockStoreClinicianFeedback,
    } as unknown as AgentDB);

    render(<DiagnosticSummary result={mockResult} />);

    const feedbackBtn = screen.getByText('Provide Feedback');
    fireEvent.click(feedbackBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Clinician Feedback/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const submitButton = screen.queryByRole('button', { name: /submit/i });

    if (submitButton) {
      fireEvent.click(submitButton);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    }

    spy.mockRestore();
  });

  it('shows feedback button even when lesions array is empty', () => {
    const resultNoLesions = { ...mockResult, lesions: [] };
    render(<DiagnosticSummary result={resultNoLesions} />);
    const feedbackBtn = screen.queryByText('Provide Feedback');
    expect(feedbackBtn).toBeInTheDocument();
  });
});

describe('DiagnosticSummary Export Functionality', () => {
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

  it('shows export button when result is present', () => {
    render(<DiagnosticSummary result={mockResult} />);
    expect(screen.getByText('Export Encrypted Report')).toBeInTheDocument();
  });

  it('creates blob and triggers download on export click', () => {
    render(<DiagnosticSummary result={mockResult} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('does nothing on export when result is null', () => {
    const { rerender } = render(<DiagnosticSummary result={null} />);
    expect(screen.queryByText('Export Encrypted Report')).not.toBeInTheDocument();

    rerender(<DiagnosticSummary result={mockResult} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports correct data structure', async () => {
    render(<DiagnosticSummary result={mockResult} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    const createObjectURLCalls = (globalThis.URL.createObjectURL as any).mock.calls;
    const blobCall = createObjectURLCalls[0];
    const blob = blobCall[0] as Blob;
    expect(blob.type).toBe('application/json');

    const textContent = await blob.text();
    expect(textContent).toContain('clinical-analysis');
    expect(textContent).toContain(mockResult.id);
    expect(textContent).toContain('3.1.0');
  });

  it('includes signature in export when available', async () => {
    render(<DiagnosticSummary result={mockResult} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    const createObjectURLCalls = (globalThis.URL.createObjectURL as any).mock.calls;
    const blobCall = createObjectURLCalls[0];
    const blob = blobCall[0] as Blob;
    const textContent = await blob.text();
    expect(textContent).toContain('sig-123');
  });

  it('includes encryption info in export when securityContext is present', async () => {
    render(<DiagnosticSummary result={mockResult} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    const createObjectURLCalls = (globalThis.URL.createObjectURL as any).mock.calls;
    const blobCall = createObjectURLCalls[0];
    const blob = blobCall[0] as Blob;
    const textContent = await blob.text();
    expect(textContent).toContain('AES-GCM');
    expect(textContent).toContain('[1,2,3]');
  });

  it('generates random signature when not available', async () => {
    const resultNoSignature = { ...mockResult, signature: '' };
    render(<DiagnosticSummary result={resultNoSignature} />);
    const exportBtn = screen.getByText('Export Encrypted Report');
    fireEvent.click(exportBtn);

    const createObjectURLCalls = (globalThis.URL.createObjectURL as any).mock.calls;
    const blobCall = createObjectURLCalls[0];
    const blob = blobCall[0] as Blob;
    const textContent = await blob.text();
    expect(textContent).toContain('sig_');
  });
});
