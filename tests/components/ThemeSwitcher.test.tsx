import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeSwitcher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithTheme = () => {
    return render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );
  };

  describe('rendering', () => {
    it('should render three theme buttons', () => {
      renderWithTheme();

      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons).toHaveLength(3);
    });

    it('should render light theme button with Sun icon and accessible label', () => {
      renderWithTheme();

      expect(
        screen.getByRole('button', {
          name: /switch to light theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
    });

    it('should render dark theme button with Moon icon and accessible label', () => {
      renderWithTheme();

      expect(
        screen.getByRole('button', {
          name: /switch to dark theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
    });

    it('should render contrast theme button with Contrast icon and accessible label', () => {
      renderWithTheme();

      expect(
        screen.getByRole('button', {
          name: /switch to contrast theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('theme selection', () => {
    it('should highlight light theme button by default', () => {
      const { container } = renderWithTheme();

      const buttons = container.querySelectorAll('button');
      const lightButton = Array.from(buttons).find(
        (btn: Element) => btn.getAttribute('aria-label') === 'Switch to Light theme',
      );

      expect(lightButton?.className).toContain('bg-white');
      expect(lightButton?.className).toContain('text-terracotta-600');
    });

    it('should highlight dark theme button when selected', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const darkButton = screen.getByRole('button', {
        name: /switch to dark theme/i,
        hidden: true,
      });

      await user.click(darkButton);

      expect(darkButton.className).toContain('bg-stone-600');
      expect(darkButton.className).toContain('text-terracotta-600');
    });

    it('should highlight contrast theme button when selected', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const contrastButton = screen.getByRole('button', {
        name: /switch to contrast theme/i,
        hidden: true,
      });

      await user.click(contrastButton);

      expect(contrastButton.className).toContain('text-terracotta-600');
    });

    it('should switch from light to dark theme', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const darkButton = screen.getByRole('button', {
        name: /switch to dark theme/i,
        hidden: true,
      });

      await user.click(darkButton);

      const lightButton = screen.getByRole('button', {
        name: /switch to light theme/i,
        hidden: true,
      });

      expect(lightButton.className).toContain('text-stone-400');
      expect(lightButton.className).not.toContain('text-terracotta-600');
    });

    it('should switch from dark to contrast theme', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const darkButton = screen.getByRole('button', {
        name: /switch to dark theme/i,
        hidden: true,
      });
      await user.click(darkButton);

      const contrastButton = screen.getByRole('button', {
        name: /switch to contrast theme/i,
        hidden: true,
      });
      await user.click(contrastButton);

      expect(darkButton.className).toContain('text-stone-400');
      expect(contrastButton.className).toContain('text-terracotta-600');
    });
  });

  describe('user interactions', () => {
    it('should update theme state when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const darkButton = screen.getByRole('button', {
        name: /switch to dark theme/i,
        hidden: true,
      });

      await user.click(darkButton);

      expect(darkButton).toHaveAttribute('aria-label', 'Switch to Dark theme');
    });

    it('should respond to rapid theme changes', async () => {
      const user = userEvent.setup();
      renderWithTheme();

      const lightButton = screen.getByRole('button', {
        name: /switch to light theme/i,
        hidden: true,
      });
      const darkButton = screen.getByRole('button', {
        name: /switch to dark theme/i,
        hidden: true,
      });
      const contrastButton = screen.getByRole('button', {
        name: /switch to contrast theme/i,
        hidden: true,
      });

      await user.click(darkButton);
      await user.click(contrastButton);
      await user.click(lightButton);

      expect(lightButton.className).toContain('text-terracotta-600');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label for each theme button', () => {
      renderWithTheme();

      expect(
        screen.getByRole('button', {
          name: /switch to light theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /switch to dark theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /switch to contrast theme/i,
          hidden: true,
        }),
      ).toBeInTheDocument();
    });

    it('should have proper title for buttons', () => {
      renderWithTheme();

      const buttons = screen.getAllByRole('button', { hidden: true });

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('title');
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});
