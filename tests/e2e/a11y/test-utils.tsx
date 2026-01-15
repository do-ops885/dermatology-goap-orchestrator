import { AxeBuilder, } from '@axe-core/playwright';

export const axe = {
  async evaluate(page: any, options: any = {},) {
    const builder = new AxeBuilder({ page, },);

    // Apply options
    if (options.include) {
      builder.include(options.include,);
    }
    if (options.exclude) {
      builder.exclude(options.exclude,);
    }

    return await builder.analyze();
  },
};
