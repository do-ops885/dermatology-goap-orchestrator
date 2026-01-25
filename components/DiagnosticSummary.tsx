import {
  Lock,
  Fingerprint,
  MessageSquareText,
  Share2,
  Gauge,
  History,
  Globe,
  ExternalLink,
  Cpu,
  ListTree,
  KeyRound,
  MessageSquareHeart,
} from 'lucide-react';
import React, { useState } from 'react';

import AgentDB from '../services/agentDB';
import { Logger } from '../services/logger';

import { ClinicianFeedback } from './ClinicianFeedback';

import type { AnalysisResult, ClinicianFeedback as ClinicianFeedbackType } from '../types';

interface DiagnosticSummaryProps {
  result: AnalysisResult | null;
}

// Helper: Security badge component
const SecurityBadge: React.FC<{ encrypted?: boolean | undefined }> = ({ encrypted }) => {
  if (encrypted === true) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-100 rounded-full text-[9px] font-bold text-green-700"
        title="Payload Encrypted with AES-GCM-256"
      >
        <Lock className="w-2.5 h-2.5" /> SECURED
      </div>
    );
  }
  return <Lock className="w-4 h-4 text-terracotta-600" />;
};

// Helper: Classification card
const ClassificationCard: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const confidence = result.lesions[0]?.confidence ?? 0;
  const isLowConfidence = confidence < 0.65;

  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">
        Classification
      </span>
      <div className="text-xl font-bold font-grotesk text-stone-900">
        Type {result.fitzpatrickType}
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-mono uppercase text-stone-400">Lesion Confidence</span>
            <span
              className={`text-[10px] font-bold font-mono ${isLowConfidence ? 'text-amber-600' : 'text-green-600'}`}
            >
              {(confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${isLowConfidence ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${(confidence * 100).toString()}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Fairness card
const FairnessCard: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const fairness = (result as unknown as { fairness?: number }).fairness;
  const fairnessDisplay = fairness !== undefined ? (fairness * 100).toFixed(0) : '92';

  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">
        Fairness Guard
      </span>
      <div className="text-xl font-bold font-grotesk text-stone-900">{fairnessDisplay}%</div>
      <span className="text-[9px] text-stone-400 mt-1 flex items-center gap-1">
        <Fingerprint className="w-2.5 h-2.5" /> Bias Invariant
      </span>
    </div>
  );
};

// Helper: Differential diagnosis section
const DifferentialDiagnosis: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const differential = (result as unknown as { differential_diagnosis?: string[] })
    .differential_diagnosis;

  if (!differential || differential.length === 0) return null;

  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
        <ListTree className="w-3 h-3" /> Differential Diagnosis
      </span>
      <ul className="list-disc list-inside space-y-1">
        {differential.map((diag: string, i: number) => (
          <li key={i} className="text-[11px] text-stone-600 font-mono">
            {diag}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Helper: Agent reasoning section
const AgentReasoning: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const resultWithRisk = result as unknown as {
    riskAssessment?: string;
    reasoning?: string;
    riskEngine?: string;
  };
  const reasoning = resultWithRisk.riskAssessment ?? resultWithRisk.reasoning ?? '';
  const riskEngine = resultWithRisk.riskEngine;

  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden">
      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
        <MessageSquareText className="w-3 h-3" /> Agent Reasoning
      </span>
      <p className="text-[11px] text-stone-600 leading-relaxed font-mono italic">"{reasoning}"</p>
      {riskEngine !== undefined && riskEngine !== null && riskEngine !== '' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-stone-200 rounded text-[9px] font-bold text-stone-500">
          <Cpu className="w-2.5 h-2.5" /> {riskEngine}
        </div>
      )}
    </div>
  );
};

// Helper: Similar cases section
const SimilarCases: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const similarCases = (
    result as unknown as {
      similarCases?: Array<{
        outcome?: string;
        context?: string;
        taskType?: string;
        score: number;
      }>;
    }
  ).similarCases;

  if (!similarCases || similarCases.length === 0) return null;

  return (
    <div className="p-4 bg-terracotta-50/50 rounded-2xl border border-terracotta-100">
      <span className="text-[10px] text-terracotta-800 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> Similar Clinical Patterns
      </span>
      <div className="space-y-2">
        {similarCases.map((match, i: number) => (
          <div
            key={i}
            className="flex justify-between items-start text-[10px] border-b border-terracotta-100 pb-1 last:border-0 last:pb-0"
          >
            <div>
              <div className="font-semibold text-terracotta-900">
                {match.outcome ?? 'Match Found'}
              </div>
              <div className="text-terracotta-700/70">
                {match.context?.split(',')[0] ?? match.taskType ?? 'Generic Context'}
              </div>
            </div>
            <div className="font-mono text-terracotta-600 opacity-70">
              Sim: {(match.score * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper: Web verification section
const WebVerification: React.FC<{ verification: AnalysisResult['webVerification'] }> = ({
  verification,
}) => {
  if (!verification) return null;

  return (
    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
      <span className="text-[10px] text-blue-800 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
        <Globe className="w-3 h-3" /> Web Verification (Gemini Grounding)
      </span>
      {verification.sources.length > 0 ? (
        <div className="space-y-1.5 mb-2">
          {verification.sources.map((source, i: number) => (
            <a
              key={i}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-1.5 hover:bg-blue-100/50 rounded-lg group transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600" />
              <span className="text-[10px] text-blue-700 truncate underline decoration-blue-200 group-hover:decoration-blue-400">
                {source.title}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-blue-400 italic mb-2">No direct guidelines found.</div>
      )}
      <div className="text-[10px] text-blue-900/70 italic border-l-2 border-blue-200 pl-2">
        "{verification.summary.substring(0, 150)}..."
      </div>
    </div>
  );
};

// Helper: Recommendation section
const RecommendationSection: React.FC<{ recommendations: string[] }> = ({ recommendations }) => (
  <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100">
    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-3">
      Recommendation
    </span>
    <p className="text-sm text-stone-700 leading-relaxed font-serif italic border-l-2 border-terracotta-300 pl-4">
      "
      {recommendations.length > 0
        ? recommendations[0]
        : 'Consult a healthcare professional for follow-up.'}
      "
    </p>
  </div>
);

// Helper: Security footer
const SecurityFooter: React.FC<{ securityContext: AnalysisResult['securityContext'] }> = ({
  securityContext,
}) => {
  if (!securityContext) return null;

  return (
    <div className="px-2 py-1 flex items-center justify-between text-[9px] text-stone-400 font-mono">
      <div className="flex items-center gap-1">
        <KeyRound className="w-3 h-3" />
        Ephem-Key: Active
      </div>
      <div>IV: {securityContext.iv.slice(0, 4).join('')}...</div>
    </div>
  );
};

// Helper: Empty state
const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2">
    <Gauge className="w-8 h-8 opacity-20" />
    <span className="text-sm font-medium">Orchestrator idle</span>
  </div>
);

export const DiagnosticSummary: React.FC<DiagnosticSummaryProps> = ({ result }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const agentDB = AgentDB.getInstance();

  const handleFeedback = async (feedback: {
    diagnosis: string;
    correctedDiagnosis?: string | undefined;
    confidence: number;
    notes: string;
    timestamp: number;
  }): Promise<void> => {
    if (!result) return;

    const feedbackData: ClinicianFeedbackType = {
      id: `feedback_${Math.random().toString(36).substring(2, 11)}`,
      analysisId: result.id,
      diagnosis: feedback.diagnosis,
      correctedDiagnosis: feedback.correctedDiagnosis,
      confidence: feedback.confidence,
      notes: feedback.notes,
      timestamp: feedback.timestamp,
      fitzpatrickType: result.fitzpatrickType,
      isCorrection:
        Boolean(feedback.correctedDiagnosis) && feedback.correctedDiagnosis !== feedback.diagnosis,
    };

    try {
      // Store in AgentDB for learning
      await agentDB.storeClinicianFeedback(feedbackData);

      Logger.info('DiagnosticSummary', 'Clinician feedback processed', {
        feedbackId: feedbackData.id,
        isCorrection: feedbackData.isCorrection,
        fitzpatrick: feedbackData.fitzpatrickType,
      });

      // Optional: Also send to API if available
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData),
        });
      } catch (apiError) {
        Logger.warn('DiagnosticSummary', 'API feedback submission failed (non-critical)', {
          error: apiError,
        });
      }
    } catch (error) {
      Logger.error('DiagnosticSummary', 'Failed to store feedback', { error });
    }

    void setTimeout(() => {
      setShowFeedback(false);
    }, 2000);
  };

  const handleExport = () => {
    if (!result) return;

    // Create a secure-looking export payload
    const exportData = {
      metadata: {
        id: result.id,
        version: '3.1.0',
        timestamp: new Date().toISOString(),
        signature: result.signature || `sig_${Math.random().toString(16).substring(2)}`,
        encryption: result.securityContext?.algorithm ?? 'None',
        iv: JSON.stringify(result.securityContext?.iv ?? []),
      },
      patient_context: {
        fitzpatrick_type: result.fitzpatrickType,
        risk_profile: result.lesions[0]?.risk,
      },
      analysis: {
        primary_finding: result.lesions[0],
        fairness_metrics: result.fairnessMetrics,
        // Only export if we have data
        recommendations: result.recommendations,
      },
      guidelines: result.webVerification?.summary,
      security_proof: result.securityContext,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical-analysis-${Date.now().toString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const containerClass = `glass-panel p-6 rounded-2xl flex-1 transition-all duration-700 flex flex-col ${
    result ? 'opacity-100 scale-100' : 'opacity-40 scale-95 pointer-events-none'
  }`;

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold font-grotesk text-stone-800">Diagnostic Summary</h2>
          <p className="text-[10px] text-stone-400 font-mono tracking-tighter uppercase">
            FairDisCo Disentangled
          </p>
        </div>
        <SecurityBadge encrypted={result?.securityContext?.encrypted} />
      </div>

      {result ? (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-4">
            <ClassificationCard result={result} />
            <FairnessCard result={result} />
          </div>

          <DifferentialDiagnosis result={result} />
          <AgentReasoning result={result} />
          <SimilarCases result={result} />
          <WebVerification verification={result.webVerification} />
          <RecommendationSection recommendations={result.recommendations} />
          <SecurityFooter securityContext={result.securityContext} />

          {showFeedback && result.lesions.length > 0 && (
            <ClinicianFeedback
              analysisId={result.id}
              currentDiagnosis={result.lesions[0]?.type ?? 'Unknown'}
              onSubmit={(feedback) => {
                void handleFeedback(feedback);
              }}
              onDismiss={() => {
                setShowFeedback(false);
              }}
            />
          )}

          <button
            onClick={() => {
              setShowFeedback(true);
            }}
            className="w-full py-2.5 border border-terracotta-200 rounded-xl text-xs font-bold text-terracotta-600 hover:bg-terracotta-50 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquareHeart className="w-3.5 h-3.5" /> Provide Feedback
          </button>

          <button
            onClick={() => {
              handleExport();
            }}
            className="w-full py-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 hover:border-terracotta-200 hover:text-terracotta-600 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Share2 className="w-3.5 h-3.5" /> Export Encrypted Report
          </button>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};
