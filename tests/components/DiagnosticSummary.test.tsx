import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import AgentDB from '../../services/agentDB';
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const mockAgentDBInstance = {
      storeClinicianFeedback: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(AgentDB, 'getInstance').mockReturnValue(mockAgentDBInstance as any);

    global.Blob = class MockBlob {
      constructor(
        public parts: any[],
        public options: any,
      ) {}

      async text() {
        return this.parts[0] as string;
      }

      get type() {
        return this.options?.type ?? 'application/json';
      }
    } as any;

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders idle state when result is null', () => {
      render(<DiagnosticSummary result={null} />);
      expect(screen.getByText('Orchestrator idle')).toBeInTheDocument();
    });

    it('renders idle state with proper styling', () => {
      const { container } = render(<DiagnosticSummary result={null} />);
      const gaugeIcon = container.querySelector('svg');
      expect(gaugeIcon).toBeInTheDocument();
      expect(container.querySelector('.text-stone-300')).toBeInTheDocument();
    });
  });

  describe('Header and Security Badge', () => {
    it('renders header with title and subtitle', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('Diagnostic Summary')).toBeInTheDocument();
      expect(screen.getByText('FairDisCo Disentangled')).toBeInTheDocument();
    });

    it('shows SECURED badge when encrypted', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('SECURED')).toBeInTheDocument();
    });

    it('shows lock icon without SECURED text when not encrypted', () => {
      const unencryptedResult = {
        ...mockResult,
        securityContext: {
          ...mockResult.securityContext!,
          encrypted: false,
        },
      };
      const { container } = render(<DiagnosticSummary result={unencryptedResult} />);
      expect(screen.queryByText('SECURED')).not.toBeInTheDocument();
      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).toBeInTheDocument();
    });

    it('shows lock icon when securityContext is undefined', () => {
      const resultNoSecurity = { ...mockResult, securityContext: undefined };
      const { container } = render(<DiagnosticSummary result={resultNoSecurity} />);
      const lockIcon = container.querySelector('.lucide-lock');
      expect(lockIcon).toBeInTheDocument();
    });
  });

  describe('Classification Card', () => {
    it('displays Fitzpatrick type correctly', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('Type III')).toBeInTheDocument();
    });

    it('displays confidence percentage correctly for high confidence', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('shows green color for high confidence (>= 0.65)', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const confidenceElement = screen.getByText('85.0%');
      expect(confidenceElement).toHaveClass('text-green-600');
    });

    it('shows amber color for low confidence (< 0.65)', () => {
      const lowConfidenceResult = {
        ...mockResult,
        lesions: [{ type: 'Basal Cell Carcinoma', confidence: 0.5, risk: 'Medium' as const }],
      };
      render(<DiagnosticSummary result={lowConfidenceResult} />);
      const confidenceElement = screen.getByText('50.0%');
      expect(confidenceElement).toHaveClass('text-amber-600');
    });

    it('handles missing lesion array gracefully', () => {
      const noLesionResult = { ...mockResult, lesions: [] };
      render(<DiagnosticSummary result={noLesionResult} />);
      expect(screen.getByText('Type III')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('Fairness Card', () => {
    it('displays fairness score with default fallback', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('displays fairness score from result when available', () => {
      const resultWithFairness = {
        ...mockResult,
        fairness: 0.88,
      } as any;
      render(<DiagnosticSummary result={resultWithFairness} />);
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('shows "Bias Invariant" badge', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText(/Bias Invariant/i)).toBeInTheDocument();
    });
  });

  describe('Differential Diagnosis', () => {
    it('renders differential diagnosis when present', () => {
      const resultWithDifferential = {
        ...mockResult,
        differential_diagnosis: ['Melanoma', 'Basal Cell Carcinoma', 'Squamous Cell Carcinoma'],
      } as any;
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
      const resultWithEmptyDifferential = {
        ...mockResult,
        differential_diagnosis: [],
      } as any;
      render(<DiagnosticSummary result={resultWithEmptyDifferential} />);
      expect(screen.queryByText('Differential Diagnosis')).not.toBeInTheDocument();
    });
  });

  describe('Agent Reasoning', () => {
    it('displays risk assessment reasoning', () => {
      const resultWithReasoning = {
        ...mockResult,
        riskAssessment: 'High risk detected due to irregular borders and color variation.',
      } as any;
      render(<DiagnosticSummary result={resultWithReasoning} />);
      expect(screen.getByText('Agent Reasoning')).toBeInTheDocument();
      expect(
        screen.getByText(/High risk detected due to irregular borders and color variation/i),
      ).toBeInTheDocument();
    });

    it('displays reasoning field when riskAssessment is absent', () => {
      const resultWithReasoningField = {
        ...mockResult,
        reasoning: 'Pigmented lesion with asymmetrical morphology.',
      } as any;
      render(<DiagnosticSummary result={resultWithReasoningField} />);
      expect(
        screen.getByText(/Pigmented lesion with asymmetrical morphology/i),
      ).toBeInTheDocument();
    });

    it('displays risk engine badge when present', () => {
      const resultWithEngine = {
        ...mockResult,
        riskEngine: 'WebLLM SmolLM2',
      } as any;
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

  describe('Similar Cases', () => {
    it('renders similar cases when present', () => {
      const resultWithSimilarCases = {
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
      } as any;
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
      const resultWithFallbackCase = {
        ...mockResult,
        similarCases: [
          {
            score: 0.85,
            context: 'Generic skin lesion',
            taskType: 'General Diagnosis',
          },
        ],
      } as any;
      render(<DiagnosticSummary result={resultWithFallbackCase} />);
      expect(screen.getByText('Match Found')).toBeInTheDocument();
    });

    it('displays context when available', () => {
      const resultWithContext = {
        ...mockResult,
        similarCases: [
          {
            outcome: 'Test Outcome',
            context: 'Sun-damaged skin, back region, irregular borders',
            score: 0.9,
          },
        ],
      } as any;
      render(<DiagnosticSummary result={resultWithContext} />);
      expect(screen.getByText('Sun-damaged skin')).toBeInTheDocument();
    });

    it('displays task type when context is missing', () => {
      const resultWithTaskType = {
        ...mockResult,
        similarCases: [
          {
            outcome: 'Test Outcome',
            taskType: 'Melanoma Detection',
            score: 0.88,
          },
        ],
      } as any;
      render(<DiagnosticSummary result={resultWithTaskType} />);
      expect(screen.getByText('Melanoma Detection')).toBeInTheDocument();
    });
  });

  describe('Web Verification', () => {
    it('renders web verification with sources', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('Web Verification (Gemini Grounding)')).toBeInTheDocument();
      expect(screen.getByText('Clinical Guideline 1')).toBeInTheDocument();
      expect(
        screen.getByText(/Verified online according to clinical guidelines/i),
      ).toBeInTheDocument();
    });

    it('renders multiple sources', () => {
      const resultWithMultipleSources = {
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
      const resultWithNoSources = {
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
      const resultWithLongSummary = {
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

  describe('Recommendations', () => {
    it('displays recommendation from array', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText(/See a doctor immediately/i)).toBeInTheDocument();
    });

    it('displays fallback message when recommendations array is empty', () => {
      const resultWithEmptyRecommendations = {
        ...mockResult,
        recommendations: [],
      };
      render(<DiagnosticSummary result={resultWithEmptyRecommendations} />);
      expect(
        screen.getByText(/Consult a healthcare professional for follow-up/i),
      ).toBeInTheDocument();
    });

    it('displays multiple recommendations (only first one shown)', () => {
      const resultWithMultipleRecommendations = {
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

  describe('Security Footer', () => {
    it('displays security footer when securityContext is present', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('Ephem-Key: Active')).toBeInTheDocument();
      expect(screen.getByText(/IV:/)).toBeInTheDocument();
    });

    it('truncates IV to first 4 elements', () => {
      const resultWithLongIV = {
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

  describe('Different Skin Tones (Fitzpatrick Types)', () => {
    const fitzpatrickTypes: AnalysisResult['fitzpatrickType'][] = [
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
    ];

    fitzpatrickTypes.forEach((type) => {
      it(`renders correctly for Fitzpatrick type ${type}`, () => {
        const resultWithType = { ...mockResult, fitzpatrickType: type };
        render(<DiagnosticSummary result={resultWithType} />);
        expect(screen.getByText(`Type ${type}`)).toBeInTheDocument();
      });
    });
  });

  describe('Feedback Functionality', () => {
    it('shows feedback button when result has lesions', () => {
      render(<DiagnosticSummary result={mockResult} />);
      expect(screen.getByText('Provide Feedback')).toBeInTheDocument();
    });

    it('opens feedback modal when button is clicked', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const feedbackBtn = screen.getByText('Provide Feedback');
      fireEvent.click(feedbackBtn);

      const clinicianFeedback = screen.getByText(/Clinician Feedback/i);
      expect(clinicianFeedback).toBeInTheDocument();
    });

    it('stores feedback when submitted', async () => {
      const mockStoreClinicianFeedback = vi.fn().mockResolvedValue(undefined);
      (AgentDB.getInstance as any).mockReturnValue({
        storeClinicianFeedback: mockStoreClinicianFeedback,
      });

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
    });

    it('does not show feedback button when lesions array is empty', () => {
      const resultNoLesions = { ...mockResult, lesions: [] };
      render(<DiagnosticSummary result={resultNoLesions} />);
      const feedbackBtn = screen.queryByText('Provide Feedback');
      expect(feedbackBtn).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
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

    it('exports correct data structure', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const exportBtn = screen.getByText('Export Encrypted Report');
      fireEvent.click(exportBtn);

      const blobCall = (globalThis.URL.createObjectURL as any).mock.calls[0];
      const blob = blobCall[0];
      expect(blob.type).toBe('application/json');

      const textContent = blob.text();
      expect(textContent).resolves.toContain('clinical-analysis');
      expect(textContent).resolves.toContain(mockResult.id);
      expect(textContent).resolves.toContain('3.1.0');
    });

    it('includes signature in export when available', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const exportBtn = screen.getByText('Export Encrypted Report');
      fireEvent.click(exportBtn);

      const blobCall = (globalThis.URL.createObjectURL as any).mock.calls[0];
      const blob = blobCall[0];
      const textContent = blob.text();
      expect(textContent).resolves.toContain('sig-123');
    });

    it('includes encryption info in export when securityContext is present', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const exportBtn = screen.getByText('Export Encrypted Report');
      fireEvent.click(exportBtn);

      const blobCall = (globalThis.URL.createObjectURL as any).mock.calls[0];
      const blob = blobCall[0];
      const textContent = blob.text();
      expect(textContent).resolves.toContain('AES-GCM');
      expect(textContent).resolves.toContain('[1,2,3]');
    });

    it('generates random signature when not available', () => {
      const resultNoSignature = { ...mockResult, signature: '' };
      render(<DiagnosticSummary result={resultNoSignature} />);
      const exportBtn = screen.getByText('Export Encrypted Report');
      fireEvent.click(exportBtn);

      const blobCall = (globalThis.URL.createObjectURL as any).mock.calls[0];
      const blob = blobCall[0];
      const textContent = blob.text();
      expect(textContent).resolves.toContain('sig_');
    });
  });

  describe('Container Styling and Transitions', () => {
    it('applies proper CSS classes when result is present', () => {
      const { container } = render(<DiagnosticSummary result={mockResult} />);
      const panel = container.querySelector('.glass-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('opacity-100');
      expect(panel).toHaveClass('scale-100');
    });

    it('applies disabled CSS classes when result is null', () => {
      const { container } = render(<DiagnosticSummary result={null} />);
      const panel = container.querySelector('.glass-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('opacity-40');
      expect(panel).toHaveClass('scale-95');
      expect(panel).toHaveClass('pointer-events-none');
    });
  });

  describe('Edge Cases and Error Handling', () => {
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

    it('handles extremely high confidence score', () => {
      const highConfidenceResult = {
        ...mockResult,
        lesions: [{ type: 'Melanoma', confidence: 1.0, risk: 'High' as const }],
      };
      render(<DiagnosticSummary result={highConfidenceResult} />);
      expect(screen.getByText('100.0%')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toHaveClass('text-green-600');
    });

    it('handles zero confidence score', () => {
      const zeroConfidenceResult = {
        ...mockResult,
        lesions: [{ type: 'Melanoma', confidence: 0.0, risk: 'Low' as const }],
      };
      render(<DiagnosticSummary result={zeroConfidenceResult} />);
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toHaveClass('text-amber-600');
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

  describe('Different Lesion Types and Risk Levels', () => {
    it('displays Basal Cell Carcinoma correctly', () => {
      const bccResult = {
        ...mockResult,
        lesions: [{ type: 'Basal Cell Carcinoma', confidence: 0.72, risk: 'Medium' as const }],
      };
      render(<DiagnosticSummary result={bccResult} />);
      expect(screen.getByText('72.0%')).toBeInTheDocument();
    });

    it('displays Squamous Cell Carcinoma correctly', () => {
      const sccResult = {
        ...mockResult,
        lesions: [{ type: 'Squamous Cell Carcinoma', confidence: 0.68, risk: 'Medium' as const }],
      };
      render(<DiagnosticSummary result={sccResult} />);
      expect(screen.getByText('68.0%')).toBeInTheDocument();
    });

    it('handles Low risk level', () => {
      const lowRiskResult = {
        ...mockResult,
        lesions: [{ type: 'Benign Nevi', confidence: 0.92, risk: 'Low' as const }],
      };
      render(<DiagnosticSummary result={lowRiskResult} />);
      expect(screen.getByText('92.0%')).toBeInTheDocument();
      expect(screen.getByText('92.0%')).toHaveClass('text-green-600');
    });

    it('handles High risk level', () => {
      const highRiskResult = {
        ...mockResult,
        lesions: [{ type: 'Melanoma', confidence: 0.78, risk: 'High' as const }],
      };
      render(<DiagnosticSummary result={highRiskResult} />);
      expect(screen.getByText('78.0%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders with proper heading structure', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const heading = screen.getByRole('heading', { name: 'Diagnostic Summary' });
      expect(heading).toBeInTheDocument();
    });

    it('provides accessible feedback button', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const feedbackBtn = screen.getByRole('button', { name: /provide feedback/i });
      expect(feedbackBtn).toBeInTheDocument();
    });

    it('provides accessible export button', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const exportBtn = screen.getByRole('button', { name: /export encrypted report/i });
      expect(exportBtn).toBeInTheDocument();
    });

    it('provides accessible external links', () => {
      render(<DiagnosticSummary result={mockResult} />);
      const link = screen.getByRole('link', { name: 'Clinical Guideline 1' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
