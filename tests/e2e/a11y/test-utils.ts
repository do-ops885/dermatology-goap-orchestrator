import { AxeBuilder } from '@axe-core/playwright';

import type { Page } from '@playwright/test';
import type { AxeResults as AxeCoreResults } from 'axe-core';

interface AxeEvaluateOptions {
  include?: string | string[];
  exclude?: string | string[];
  runOnly?: string[];
}

export const axe = {
  async evaluate(page: Page, options: AxeEvaluateOptions = {}): Promise<AxeCoreResults> {
    const builder = new AxeBuilder({ page });

    if (options.include) {
      builder.include(options.include);
    }
    if (options.exclude) {
      builder.exclude(options.exclude);
    }
    if (options.runOnly) {
      builder.withTags(options.runOnly);
    }

    return await builder.analyze();
  },
};
