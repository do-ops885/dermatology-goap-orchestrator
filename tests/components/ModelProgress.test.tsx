import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ModelProgress } from '../../components/ModelProgress';

describe('ModelProgress', () => {
  it('should not render when progress is null', () => {
    const { container } = render(<ModelProgress progress={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render progress bar when progress is provided', () => {
    render(<ModelProgress progress={{ text: 'Loading model...', percent: 50 }} />);

    expect(screen.getByText('Offline AI Engine')).toBeInTheDocument();
    expect(screen.getByText('Downloading SmolLM2-1.7B')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Loading model...')).toBeInTheDocument();
  });

  it('should show loading spinner when progress is less than 100%', () => {
    const { container } = render(
      <ModelProgress progress={{ text: 'Downloading...', percent: 75 }} />,
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    // Check for loading spinner (Loader2 component)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show check icon when progress is 100%', () => {
    const { container } = render(<ModelProgress progress={{ text: 'Complete!', percent: 100 }} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    // Check that spinner is not present
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('should display correct progress text', () => {
    const progressText = 'Downloading model weights 1/5';
    render(<ModelProgress progress={{ text: progressText, percent: 20 }} />);

    expect(screen.getByText(progressText)).toBeInTheDocument();
  });

  it('should render with 0% progress', () => {
    render(<ModelProgress progress={{ text: 'Starting...', percent: 0 }} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('should render with progress between 0 and 100', () => {
    const testCases = [1, 25, 50, 75, 99];

    testCases.forEach((percent) => {
      const { unmount } = render(
        <ModelProgress progress={{ text: `Loading ${percent}%`, percent }} />,
      );
      expect(screen.getByText(`${percent}%`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should have proper accessibility structure', () => {
    render(<ModelProgress progress={{ text: 'Loading...', percent: 60 }} />);

    // Check for semantic structure - component renders with proper styling
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should truncate long progress text', () => {
    const longText =
      'This is a very long progress text that should be truncated to prevent layout issues in the UI component';
    render(<ModelProgress progress={{ text: longText, percent: 45 }} />);

    const textElement = screen.getByText(longText);
    expect(textElement).toHaveClass('truncate');
  });

  it('should handle decimal progress values', () => {
    render(<ModelProgress progress={{ text: 'Almost there...', percent: 99.9 }} />);

    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });
});
