/**
 * Lazy-loaded components for code splitting
 *
 * These components are loaded on-demand to reduce initial bundle size.
 * Each component is split into its own chunk.
 *
 * @see plans/24_performance_optimization_strategy.md
 */

import { lazy, Suspense, ComponentType, ReactNode } from 'react';

// Lazy load heavy components
export const LazyDiagnosticSummary = lazy(() =>
  import('./DiagnosticSummary').then((module) => ({ default: module.DiagnosticSummary })),
);

export const LazyFairnessDashboard = lazy(() => import('./FairnessDashboard'));

export const LazyFairnessReport = lazy(() => import('./FairnessReport'));

export const LazyAgentFlow = lazy(() =>
  import('./AgentFlow').then((module) => ({
    default: module.MemoizedAgentFlow || module.AgentFlow,
  })),
);

export const LazyTraceTimeline = lazy(() => import('./TraceTimeline'));

export const LazyClinicianFeedback = lazy(() =>
  import('./ClinicianFeedback').then((module) => ({ default: module.ClinicianFeedback })),
);

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin" />
      <span className="text-sm text-stone-500">{message}</span>
    </div>
  </div>
);

// Wrapper component with suspense
export const LazyWrapper = ({
  component: Component,
  fallback,
  ...props
}: {
  component: ComponentType<any>;
  fallback?: ReactNode;
  [key: string]: any;
}) => (
  <Suspense fallback={fallback || <LoadingFallback />}>
    <Component {...props} />
  </Suspense>
);

// Export individual wrapped components for convenience
export const DiagnosticSummaryLazy = (props: any) => (
  <LazyWrapper
    component={LazyDiagnosticSummary}
    fallback={<LoadingFallback message="Loading analysis..." />}
    {...props}
  />
);

export const FairnessDashboardLazy = (props: any) => (
  <LazyWrapper
    component={LazyFairnessDashboard}
    fallback={<LoadingFallback message="Loading fairness metrics..." />}
    {...props}
  />
);

export const FairnessReportLazy = (props: any) => (
  <LazyWrapper
    component={LazyFairnessReport}
    fallback={<LoadingFallback message="Loading report..." />}
    {...props}
  />
);

export const AgentFlowLazy = (props: any) => (
  <LazyWrapper
    component={LazyAgentFlow}
    fallback={<LoadingFallback message="Loading agent flow..." />}
    {...props}
  />
);

export const TraceTimelineLazy = (props: any) => (
  <LazyWrapper
    component={LazyTraceTimeline}
    fallback={<LoadingFallback message="Loading timeline..." />}
    {...props}
  />
);
