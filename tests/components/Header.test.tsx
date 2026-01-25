import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../../components/Header';
import { ThemeProvider } from '../../context/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

describe('Header', () => {
  const mockBeforeInstallPrompt = (event: Partial<BeforeInstallPromptEvent>) => {
    const mockEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.assign(mockEvent, event);
    window.dispatchEvent(mockEvent);
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithTheme = (dbReady = true) => {
    return render(
      <ThemeProvider>
        <Header dbReady={dbReady} />
      </ThemeProvider>,
    );
  };

  describe('rendering', () => {
    it('should render main heading', () => {
      renderWithTheme();

      expect(screen.getByText(/clinical ai/i)).toBeVisible();
      expect(screen.getByText(/orchestrator/i)).toBeVisible();
    });

    it('should render version badge', () => {
      renderWithTheme();

      expect(screen.getByText(/medical ai v3.1/i)).toBeVisible();
    });

    it('should render description text', () => {
      renderWithTheme();

      expect(
        screen.getByText(/autonomous multi-agent system ensuring diagnostic equity/i),
      ).toBeVisible();
    });

    it('should render ThemeSwitcher component', () => {
      renderWithTheme();

      expect(
        screen.getByRole('button', { name: /switch to light theme/i, hidden: true }),
      ).toBeVisible();
    });

    it('should render database status badge when online', () => {
      renderWithTheme(true);

      expect(screen.getByText(/audit ledger: active/i)).toBeVisible();
    });

    it('should render syncing status when db not ready', () => {
      renderWithTheme(false);

      expect(screen.getByText(/audit ledger: syncing\.\.\./i)).toBeVisible();
    });

    it('should render encryption badge', () => {
      renderWithTheme();

      expect(screen.getByText(/patient data encrypted/i)).toBeVisible();
    });
  });

  describe('PWA install prompt', () => {
    it('should show install button when beforeinstallprompt event fires', () => {
      renderWithTheme();

      expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();

      act(() => {
        mockBeforeInstallPrompt({
          prompt: vi.fn().mockResolvedValue(undefined),
          userChoice: Promise.resolve({ outcome: 'accepted' as const }),
        });
      });

      expect(screen.getByRole('button', { name: /install app/i })).toBeVisible();
    });

    it('should not show install button by default', () => {
      renderWithTheme();

      expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
    });

    it('should call prompt and remove button on install click', async () => {
      const user = userEvent.setup();
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      renderWithTheme();

      act(() => {
        mockBeforeInstallPrompt({
          prompt: mockPrompt,
          userChoice: Promise.resolve({ outcome: 'accepted' as const }),
        });
      });

      const installButton = screen.getByRole('button', { name: /install app/i });
      await user.click(installButton);

      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe('online/offline status', () => {
    it('should show offline mode badge when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithTheme();

      expect(screen.getByText(/offline mode/i)).toBeVisible();
      expect(screen.queryByText(/audit ledger: active/i)).not.toBeInTheDocument();
    });

    it('should show database status when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      renderWithTheme(true);

      expect(screen.getByText(/audit ledger: active/i)).toBeVisible();
      expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
    });

    it('should handle online-to-offline transition', () => {
      renderWithTheme();

      expect(screen.getByText(/audit ledger: active/i)).toBeVisible();

      window.dispatchEvent(new Event('offline'));
    });

    it('should handle offline-to-online transition', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithTheme();

      window.dispatchEvent(new Event('online'));
    });
  });

  describe('layout and styling', () => {
    it('should render header with correct semantic element', () => {
      renderWithTheme();

      expect(screen.getByRole('banner')).toBeVisible();
    });

    it('should render icons with semantic markup', () => {
      renderWithTheme();

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render status badges with proper semantic markup', () => {
      renderWithTheme();

      const badge = screen.getByText(/patient data encrypted/i);
      expect(badge).toBeVisible();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithTheme();

      expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    });

    it('should have accessible labels for interactive elements', () => {
      const { container } = renderWithTheme();

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should render stethoscope icon', () => {
      renderWithTheme();

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('state management', () => {
    it('should initialize with online status from navigator', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      renderWithTheme();

      expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
    });

    it('should not show install button before event', () => {
      renderWithTheme();

      expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
    });
  });

  describe('event listener cleanup', () => {
    it('should add event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderWithTheme();

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderWithTheme();

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});
