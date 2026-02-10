import { useState, useRef, lazy, Suspense } from 'react';

import { AnalysisIntake } from './components/AnalysisIntake';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { PatientSafetyState } from './components/PatientSafetyState';
import { ThemeProvider } from './context/ThemeContext';
import { useClinicalAnalysis } from './hooks/useClinicalAnalysis';

import type { AnalysisResult } from './types';

// Lazy load heavy components for better initial load performance
const AgentFlow = lazy(() => import('./components/AgentFlow'));
const DiagnosticSummary = lazy(() =>
  import('./components/DiagnosticSummary').then((m) => ({ default: m.DiagnosticSummary })),
);
const FairnessDashboard = lazy(() => import('./components/FairnessDashboard'));
const FairnessReport = lazy(() => import('./components/FairnessReport'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-6 h-6 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin" />
  </div>
);

export default function App() {
  const [showFairnessReport, setShowFairnessReport] = useState(false);
  const agentFlowRef = useRef<HTMLDivElement>(null);

  const {
    file,
    preview,
    worldState,
    result,
    error: errorMessage,
    warning,
    modelProgress,
    analyzing,
    dbReady,
    handleFileChange,
    executeAnalysis,
    privacyMode,
    setPrivacyMode,
    trace,
    currentAgent,
  } = useClinicalAnalysis();

  const handleExecute = () => {
    void executeAnalysis();
    setTimeout(() => {
      agentFlowRef.current?.focus();
    }, 100);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 transition-colors duration-300">
        {showFairnessReport && (
          <Suspense fallback={<LoadingFallback />}>
            <FairnessReport
              onClose={() => {
                setShowFairnessReport(false);
              }}
            />
          </Suspense>
        )}

        <ErrorBoundary componentName="Header">
          <Header dbReady={dbReady} />
        </ErrorBoundary>

        <main
          id="main-content"
          className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[700px]"
        >
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ErrorBoundary componentName="Intake Module">
              <AnalysisIntake
                error={errorMessage}
                warning={warning}
                modelProgress={modelProgress}
                preview={preview}
                analyzing={analyzing}
                dbReady={dbReady}
                file={file}
                onFileChange={(_e) => {
                  void handleFileChange(_e);
                }}
                onExecute={handleExecute}
                heatmapOverlay={result?.lesions?.[0]?.heatmap}
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
              />
            </ErrorBoundary>
            <ErrorBoundary componentName="Fairness Dashboard">
              <Suspense fallback={<LoadingFallback />}>
                <FairnessDashboard
                  onOpenReport={() => {
                    setShowFairnessReport(true);
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-4 h-full">
            <ErrorBoundary componentName="Agent Flow Orchestrator">
              <Suspense fallback={<LoadingFallback />}>
                <AgentFlow trace={trace} currentAgent={currentAgent} ref={agentFlowRef} />
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <ErrorBoundary componentName="Safety State">
              <PatientSafetyState worldState={worldState} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Diagnostic Summary">
              <Suspense fallback={<LoadingFallback />}>
                <DiagnosticSummary result={result as AnalysisResult | null} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
