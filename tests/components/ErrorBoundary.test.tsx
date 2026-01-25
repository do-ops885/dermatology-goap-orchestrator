import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '../../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('rendering children', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child Content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Child Content')).toBeVisible();
    });
  });

  describe('error state', () => {
    it('should display default error UI when child throws error', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/module failed/i)).toBeVisible();
      expect(screen.getByText(/test error/i)).toBeVisible();
    });

    it('should display componentName in error UI', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/TestComponent Module Failed/i)).toBeVisible();
    });

    it('should display fallback UI when provided', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };
      const fallback = <div>Custom Fallback</div>;

      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom Fallback')).toBeVisible();
      expect(screen.queryByText(/module failed/i)).not.toBeInTheDocument();
    });

    it('should display generic error message when error has no message', () => {
      const ThrowError = () => {
        throw new Error('');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/module failed/i)).toBeVisible();
      expect(screen.getByText(/an unexpected error occurred/i)).toBeVisible();
    });
  });

  describe('reset functionality', () => {
    it('should reset error state when restart button is clicked', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const ConditionalThrow = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered Content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/module failed/i)).toBeVisible();

      shouldThrow = false;
      rerender(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>,
      );

      const restartButton = screen.getByRole('button', { name: /restart module/i });
      await user.click(restartButton);

      expect(screen.getByText('Recovered Content')).toBeVisible();
    });

    it('restart button should have accessible label', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole('button', {
          name: /restart module/i,
        }),
      ).toBeVisible();
    });
  });

  describe('accessibility', () => {
    it('should render error icon with semantic markup', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have proper heading hierarchy in error UI', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });
  });
});
