import React, { useState } from 'react';
import { useClinicalAnalysis } from './hooks/useClinicalAnalysis';
import { Header } from './components/Header';
import { AnalysisIntake } from './components/AnalysisIntake';
import { PatientSafetyState } from './components/PatientSafetyState';
import { DiagnosticSummary } from './components/DiagnosticSummary';
import FairnessDashboard from './components/FairnessDashboard';
import FairnessReport from './components/FairnessReport';
import AgentFlow from './components/AgentFlow';

export default function App() {
  const [showFairnessReport, setShowFairnessReport] = useState(false);
  
  const {
    file,
    preview,
    logs,
    worldState,
    result,
    error,
    warning,
    analyzing,
    dbReady,
    handleFileChange,
    executeAnalysis
  } = useClinicalAnalysis();

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8">
      {showFairnessReport && <FairnessReport onClose={() => setShowFairnessReport(false)} />}

      <Header dbReady={dbReady} />

      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[700px]">
        
        {/* Left Column: Intake & Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <AnalysisIntake 
            error={error}
            warning={warning}
            preview={preview}
            analyzing={analyzing}
            dbReady={dbReady}
            file={file}
            onFileChange={handleFileChange}
            onExecute={executeAnalysis}
          />
          <FairnessDashboard onOpenReport={() => setShowFairnessReport(true)} />
        </div>

        {/* Middle Column: Agent Flow */}
        <div className="lg:col-span-4 h-full">
            <AgentFlow logs={logs} />
        </div>

        {/* Right Column: Status & Results */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <PatientSafetyState worldState={worldState} />
            <DiagnosticSummary result={result} />
        </div>

      </main>
    </div>
  );
}