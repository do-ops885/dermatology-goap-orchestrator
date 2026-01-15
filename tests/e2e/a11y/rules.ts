export interface CustomAxeRule {
  id: string;
  evaluate: (_node: Element) => boolean;
  metadata?: {
    description?: string;
    helpUrl?: string;
  };
}

export const agentStatusRule: CustomAxeRule = {
  id: 'analysis-status',
  evaluate: (node: Element,): boolean => {
    const statusElement = node.querySelector('[data-status]',);
    if (statusElement) {
      return (
        statusElement.hasAttribute('aria-live',) || statusElement.getAttribute('role',) === 'status'
      );
    }
    return true;
  },
};

export const chartRule: CustomAxeRule = {
  id: 'aria-chart',
  evaluate: (node: Element,): boolean => {
    const chart = node.querySelector('[data-testid="chart"]',);
    if (chart) {
      return chart.hasAttribute('aria-label',) || chart.getAttribute('role',) === 'img';
    }
    return true;
  },
};
