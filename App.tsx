import React, { useState, useRef } from 'react';
import { useClinicalAnalysis } from './hooks/useClinicalAnalysis';
import { Header } from './components/Header';
import { AnalysisIntake } from './components/AnalysisIntake';
import { PatientSafetyState } from './components/PatientSafetyState';
import { DiagnosticSummary } from './components/DiagnosticSummary';
import FairnessDashboard from './components/FairnessDashboard';
import FairnessReport from './components/FairnessReport';
import AgentFlow from './components/AgentFlow';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [showFairnessReport, setShowFairnessReport] = useState(false);
  const agentFlowRef = useRef<HTMLDivElement>(null);

  const {
    file,
    preview,
    logs,
    worldState,
    result,
    error,
    warning,
    modelProgress,
    analyzing,
    dbReady,
    handleFileChange,
    executeAnalysis,
    privacyMode,
    setPrivacyMode
  } = useClinicalAnalysis();

  const handleExecute = () => {
    void executeAnalysis();
    // A11y: Move focus to the live agent logs so screen readers follow the action
    setTimeout(() => {
      agentFlowRef.current?.focus();
    }, 100);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 transition-colors duration-300">
        {showFairnessReport && <FairnessReport onClose={() => setShowFairnessReport(false)} />}

        <ErrorBoundary componentName="Header">
           <Header dbReady={dbReady} />
        </ErrorBoundary>

        <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[700px]">

          {/* Left Column: Intake & Dashboard */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ErrorBoundary componentName="Intake Module">
                <AnalysisIntake
                error={error}
                warning={warning}
                modelProgress={modelProgress}
                preview={preview}
                analyzing={analyzing}
                dbReady={dbReady}
                file={file}
                onFileChange={handleFileChange}
                onExecute={handleExecute}
                heatmapOverlay={result?.lesions?.[0]?.heatmap}
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
                />
            </ErrorBoundary>
            <ErrorBoundary componentName="Fairness Dashboard">
                <FairnessDashboard onOpenReport={() => setShowFairnessReport(true)} />
            </ErrorBoundary>
          </div>

          {/* Middle Column: Agent Flow */}
          <div className="lg:col-span-4 h-full">
              <ErrorBoundary componentName="Agent Flow Orchestrator">
                  <AgentFlow logs={logs} ref={agentFlowRef} />
              </ErrorBoundary>
          </div>

          {/* Right Column: Status & Results */}
          <div className="lg:col-span-4 flex flex-col gap-6">
              <ErrorBoundary componentName="Safety State">
                  <PatientSafetyState worldState={worldState} />
              </ErrorBoundary>
              <ErrorBoundary componentName="Diagnostic Summary">
                  <DiagnosticSummary result={result} />
              </ErrorBoundary>
          </div>

        </main>
      </div>
    </ThemeProvider>
  );
}
