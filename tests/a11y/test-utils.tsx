import { configureAxe } from '@axe-core/playwright';

export const axe = configureAxe({
  rules: [
    { id: 'color-contrast', enabled: true },
    { id: 'keyboard', enabled: true },
    { id: 'label', enabled: true },
    { id: 'image-alt', enabled: true },
    { id: 'button-name', enabled: true },
    { id: 'focus-visible', enabled: true },
    { id: 'aria-required-attr', enabled: true },
    { id: 'aria-valid-attr-value', enabled: true },
    { id: 'analysis-status', enabled: true },
  ]
});
