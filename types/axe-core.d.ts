declare module 'axe-core' {
  interface AxeResults {
    passes: AxeResult[];
    violations: AxeResult[];
    inapplicable: AxeResult[];
    incomplete: AxeResult[];
    timestamp: string;
    url: string;
  }

  interface AxeResult {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: AxeNode[];
  }

  interface AxeNode {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
    html: string;
    target: string[];
    failureSummary?: string;
  }

  interface AxeContext {
    include?: string | string[];
    exclude?: string | string[];
  }

  interface AxeOptions {
    runOnly?: { type: 'rule' | 'tag'; values: string[] } | string[];
    rules?: Record<string, { enabled: boolean }>;
    resultTypes?: string[];
  }

  function run(
    context?: AxeContext,
    options?: AxeOptions,
    callback?: (error: Error | null, results: AxeResults) => void,
  ): Promise<AxeResults>;

  function run(
    options?: AxeOptions,
    callback?: (error: Error | null, results: AxeResults) => void,
  ): Promise<AxeResults>;
}
