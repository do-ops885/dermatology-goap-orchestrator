import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FairnessDashboard from '../../components/FairnessDashboard';
import AgentDB from '../../services/agentDB';

// Mock Recharts to avoid ResizeObserver issues in JSDOM
vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: 500, height: 300 }}>{children}</div>
    };
});

describe('FairnessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state correctly', async () => {
    const getInstanceSpy = vi.spyOn(AgentDB, 'getInstance').mockReturnValue({
        getFairnessMetrics: () => ({}),
        getLiveStats: vi.fn().mockResolvedValue({}),
        getFeedbackStats: vi.fn().mockResolvedValue({ totalFeedback: 0, corrections: 0, confirmations: 0, avgConfidence: 0 })
    } as any);

    await act(async () => {
      render(<FairnessDashboard />);
    });

    expect(screen.getByText('Equity Assurance')).toBeInTheDocument();
    expect(screen.getByText('TPR')).toBeInTheDocument();
    expect(screen.getByText('FPR')).toBeInTheDocument();
    
    getInstanceSpy.mockRestore();
  });

  it('fetches and displays metrics from AgentDB', async () => {
    const mockMetrics = {
        'I': { tpr: 0.95, fpr: 0.1, count: 10 },
        'II': { tpr: 0.9, fpr: 0.1, count: 5 },
        'III': { tpr: 0.8, fpr: 0.2, count: 5 },
        'IV': { tpr: 0.85, fpr: 0.15, count: 8 },
        'V': { tpr: 0.7, fpr: 0.3, count: 12 }, // Low TPR
        'VI': { tpr: 0.88, fpr: 0.12, count: 15 },
    };

    const getInstanceSpy = vi.spyOn(AgentDB, 'getInstance').mockReturnValue({
        getFairnessMetrics: () => mockMetrics,
        getLiveStats: vi.fn().mockResolvedValue(mockMetrics),
        getFeedbackStats: vi.fn().mockResolvedValue({ totalFeedback: 0, corrections: 0, confirmations: 0, avgConfidence: 0 })
    } as any);

    await act(async () => {
      render(<FairnessDashboard />);
    });

    await waitFor(() => {
        // Check for max TPR gap calculation: 0.95 - 0.7 = 0.25
        expect(screen.getByText('0.25')).toBeInTheDocument();
        // Total samples: 10+5+5+8+12+15 = 55
        expect(screen.getByText('55')).toBeInTheDocument();
    });
    
    getInstanceSpy.mockRestore();
  });

  it('shows report button when callback provided', async () => {
    const getInstanceSpy = vi.spyOn(AgentDB, 'getInstance').mockReturnValue({
        getFairnessMetrics: () => ({}),
        getLiveStats: vi.fn().mockResolvedValue({}),
        getFeedbackStats: vi.fn().mockResolvedValue({ totalFeedback: 0, corrections: 0, confirmations: 0, avgConfidence: 0 })
    } as any);

    const onOpen = vi.fn();
    
    await act(async () => {
      render(<FairnessDashboard onOpenReport={onOpen} />);
    });

    const btn = screen.getByText('Full Audit');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onOpen).toHaveBeenCalled();
    
    getInstanceSpy.mockRestore();
  });
});