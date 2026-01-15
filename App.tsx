import { useState, useRef } from 'react';

import AgentFlow from './components/AgentFlow';
import { AnalysisIntake } from './components/AnalysisIntake';
import { DiagnosticSummary } from './components/DiagnosticSummary';
import { ErrorBoundary } from './components/ErrorBoundary';
import FairnessDashboard from './components/FairnessDashboard';
import FairnessReport from './components/FairnessReport';
import { Header } from './components/Header';
import { PatientSafetyState } from './components/PatientSafetyState';
import { ThemeProvider } from './context/ThemeContext';
import { useClinicalAnalysis } from './hooks/useClinicalAnalysis';

import type { AnalysisResult } from './types';

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
          <FairnessReport
            onClose={() => {
              setShowFairnessReport(false);
            }}
          />
        )}

        <ErrorBoundary componentName="Header">
          <Header dbReady={dbReady} />
        </ErrorBoundary>

        <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[700px]">
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
              <FairnessDashboard
                onOpenReport={() => {
                  setShowFairnessReport(true);
                }}
              />
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-4 h-full">
            <ErrorBoundary componentName="Agent Flow Orchestrator">
              <AgentFlow trace={trace} currentAgent={currentAgent} ref={agentFlowRef} />
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <ErrorBoundary componentName="Safety State">
              <PatientSafetyState worldState={worldState} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Diagnostic Summary">
              <DiagnosticSummary result={result as AnalysisResult | null} />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
