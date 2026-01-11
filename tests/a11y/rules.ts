import type { Rule } from 'axe-core';

export const agentStatusRule: Rule = {
  id: 'analysis-status',
  evaluate: (node: any): boolean => {
    const statusElement = node.querySelector('[data-status]');
    if (statusElement) {
      return statusElement.hasAttribute('aria-live') || 
             statusElement.hasAttribute('role') === 'status';
    }
    return true;
  }
};

export const chartRule: Rule = {
  id: 'aria-chart',
  evaluate: (node: any): boolean => {
    const chart = node.querySelector('[data-testid="chart"]');
    if (chart) {
      return chart.hasAttribute('aria-label') ||
             chart.hasAttribute('role') === 'img';
    }
    return true;
  }
};
