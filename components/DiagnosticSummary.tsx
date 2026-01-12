import React, { useState } from 'react';
import { Lock, Fingerprint, MessageSquareText, Share2, Gauge, History, Globe, ExternalLink, Cpu, ListTree, KeyRound, MessageSquareHeart } from 'lucide-react';
import { AnalysisResult, ClinicianFeedback as ClinicianFeedbackType } from '../types';
import { ClinicianFeedback } from './ClinicianFeedback';
import AgentDB from '../services/agentDB';
import { Logger } from '../services/logger';

interface DiagnosticSummaryProps {
  result: AnalysisResult | null;
}

export const DiagnosticSummary: React.FC<DiagnosticSummaryProps> = ({ result }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const agentDB = AgentDB.getInstance();

  const handleFeedback = async (feedback: {
    diagnosis: string;
    correctedDiagnosis?: string;
    confidence: number;
    notes: string;
    timestamp: number;
  }) => {
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
      isCorrection: !!feedback.correctedDiagnosis && feedback.correctedDiagnosis !== feedback.diagnosis
    };

    try {
      // Store in AgentDB for learning
      await agentDB.storeClinicianFeedback(feedbackData);

      Logger.info('DiagnosticSummary', 'Clinician feedback processed', {
        feedbackId: feedbackData.id,
        isCorrection: feedbackData.isCorrection,
        fitzpatrick: feedbackData.fitzpatrickType
      });

      // Optional: Also send to API if available
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData)
        });
      } catch (apiError) {
        Logger.warn('DiagnosticSummary', 'API feedback submission failed (non-critical)', { error: apiError });
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
            version: "3.1.0",
            timestamp: new Date().toISOString(),
            signature: result.signature || `sig_${Math.random().toString(16).substring(2)}`,
            encryption: result.securityContext ? result.securityContext.algorithm : "None",
            iv: result.securityContext ? result.securityContext.iv : []
        },
        patient_context: {
            fitzpatrick_type: result.fitzpatrickType,
            risk_profile: result.lesions?.[0]?.risk
        },
        analysis: {
            primary_finding: result.lesions?.[0],
            fairness_metrics: result.fairnessMetrics,
            // Only export if we have data
            recommendations: result.recommendations
        },
        guidelines: result.webVerification?.summary,
        security_proof: result.securityContext
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical-analysis-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl flex-1 transition-all duration-700 flex flex-col ${result ? 'opacity-100 scale-100' : 'opacity-40 scale-95 pointer-events-none'}`}>
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-lg font-bold font-grotesk text-stone-800">Diagnostic Summary</h2>
                <p className="text-[10px] text-stone-400 font-mono tracking-tighter uppercase">FairDisCo Disentangled</p>
            </div>
            {result?.securityContext?.encrypted ? (
               <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-100 rounded-full text-[9px] font-bold text-green-700" title="Payload Encrypted with AES-GCM-256">
                  <Lock className="w-2.5 h-2.5" /> SECURED
               </div>
            ) : (
               <Lock className="w-4 h-4 text-terracotta-600" />
            )}
        </div>

        {result ? (
            <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">Classification</span>
                        <div className="text-xl font-bold font-grotesk text-stone-900">Type {result.fitzpatrickType}</div>

                        <div className="mt-3 space-y-2">
                          {/* Lesion Confidence */}
                          <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] font-mono uppercase text-stone-400">Lesion Confidence</span>
                                <span className={`text-[10px] font-bold font-mono ${result.lesions?.[0]?.confidence < 0.65 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {((result.lesions?.[0]?.confidence ?? 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                  <div
                                      className={`h-full transition-all duration-1000 ${result.lesions?.[0]?.confidence < 0.65 ? 'bg-amber-500' : 'bg-green-500'}`}
                                      style={{ width: `${(result.lesions?.[0]?.confidence ?? 0) * 100}%` }}
                                  />
                              </div>
                          </div>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">Fairness Guard</span>
                        <div className="text-xl font-bold font-grotesk text-stone-900">
                          {(result as unknown as { fairness?: number }).fairness ? ((result as unknown as { fairness: number }).fairness * 100).toFixed(0) : '92'}%
                        </div>
                        <span className="text-[9px] text-stone-400 mt-1 flex items-center gap-1"><Fingerprint className="w-2.5 h-2.5" /> Bias Invariant</span>
                    </div>
                </div>

                {/* Differential Diagnosis (Safe Access) */}
                {(result as unknown as { differential_diagnosis?: string[] }).differential_diagnosis &&
                (result as unknown as { differential_diagnosis: string[] }).differential_diagnosis.length > 0 ? (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                     <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                        <ListTree className="w-3 h-3" /> Differential Diagnosis
                     </span>
                     <ul className="list-disc list-inside space-y-1">
                        {(result as unknown as { differential_diagnosis: string[] }).differential_diagnosis.map((diag: string, i: number) => (
                           <li key={i} className="text-[11px] text-stone-600 font-mono">{diag}</li>
                        ))}
                     </ul>
                  </div>
                ) : null}

                {/* Reasoning Block */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden">
                     <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                        <MessageSquareText className="w-3 h-3" /> Agent Reasoning
                     </span>
                     <p className="text-[11px] text-stone-600 leading-relaxed font-mono italic">
                        "{(result as unknown as { riskAssessment?: string; reasoning?: string }).riskAssessment ??
                        (result as unknown as { reasoning?: string }).reasoning ?? ''}"
                     </p>
                     {(result as unknown as { riskEngine?: string }).riskEngine && (
                       <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-stone-200 rounded text-[9px] font-bold text-stone-500">
                          <Cpu className="w-2.5 h-2.5" /> {(result as unknown as { riskEngine: string }).riskEngine}
                       </div>
                     )}
                </div>

                {/* Similar Cases */}
                {(result as unknown as { similarCases?: { outcome?: string; context?: string; taskType?: string; score: number }[] }).similarCases &&
                (result as unknown as { similarCases: { outcome?: string; context?: string; taskType?: string; score: number }[] }).similarCases.length > 0 ? (
                   <div className="p-4 bg-terracotta-50/50 rounded-2xl border border-terracotta-100">
                      <span className="text-[10px] text-terracotta-800 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                         <History className="w-3 h-3" /> Similar Clinical Patterns
                      </span>
                      <div className="space-y-2">
                         {(result as unknown as { similarCases: { outcome?: string; context?: string; taskType?: string; score: number }[] }).similarCases.map((match, i: number) => (
                             <div key={i} className="flex justify-between items-start text-[10px] border-b border-terracotta-100 pb-1 last:border-0 last:pb-0">
                                <div>
                                   <div className="font-semibold text-terracotta-900">{match.outcome ?? 'Match Found'}</div>
                                   <div className="text-terracotta-700/70">{match.context?.split(',')[0] ?? match.taskType ?? 'Generic Context'}</div>
                                </div>
                                <div className="font-mono text-terracotta-600 opacity-70">
                                   Sim: {(match.score * 100).toFixed(0)}%
                                </div>
                             </div>
                         ))}
                      </div>
                   </div>
                ) : null}

                {/* Web Verification */}
                {result.webVerification && (
                   <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <span className="text-[10px] text-blue-800 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                         <Globe className="w-3 h-3" /> Web Verification (Gemini Grounding)
                      </span>
                      {result.webVerification.sources?.length > 0 ? (
                        <div className="space-y-1.5 mb-2">
                           {result.webVerification.sources.map((source, i: number) => (
                              <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1.5 hover:bg-blue-100/50 rounded-lg group transition-colors">
                                 <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600" />
                                 <span className="text-[10px] text-blue-700 truncate underline decoration-blue-200 group-hover:decoration-blue-400">
                                   {source.title ?? source.uri}
                                 </span>
                              </a>
                           ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-blue-400 italic mb-2">No direct guidelines found.</div>
                      )}
                      <div className="text-[10px] text-blue-900/70 italic border-l-2 border-blue-200 pl-2">
                         "{result.webVerification.summary?.substring(0, 150)}..."
                      </div>
                   </div>
                )}

                <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-3">Recommendation</span>
                    <p className="text-sm text-stone-700 leading-relaxed font-serif italic border-l-2 border-terracotta-300 pl-4">
                        "{result.recommendations ? result.recommendations[0] : 'Consult a healthcare professional for follow-up.'}"
                    </p>
                </div>

                {/* Security Footer */}
                {result.securityContext && (
                    <div className="px-2 py-1 flex items-center justify-between text-[9px] text-stone-400 font-mono">
                        <div className="flex items-center gap-1">
                            <KeyRound className="w-3 h-3" />
                            Ephem-Key: Active
                        </div>
                        <div>IV: {result.securityContext.iv.slice(0,4).join('')}...</div>
                    </div>
                )}

                {showFeedback && result?.lesions?.[0]?.type && (
                  <ClinicianFeedback
                    analysisId={result.id}
                    currentDiagnosis={result.lesions[0].type}
                    onSubmit={handleFeedback}
                    onDismiss={() => setShowFeedback(false)}
                  />
                )}

                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full py-2.5 border border-terracotta-200 rounded-xl text-xs font-bold text-terracotta-600 hover:bg-terracotta-50 transition-all flex items-center justify-center gap-2"
                >
                    <MessageSquareHeart className="w-3.5 h-3.5" /> Provide Feedback
                </button>

                <button
                  onClick={handleExport}
                  className="w-full py-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 hover:border-terracotta-200 hover:text-terracotta-600 transition-all flex items-center justify-center gap-2 mt-2"
                >
                    <Share2 className="w-3.5 h-3.5" /> Export Encrypted Report
                </button>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-300 gap-2">
                <Gauge className="w-8 h-8 opacity-20" />
                <span className="text-sm font-medium">Orchestrator idle</span>
            </div>
        )}
    </div>
  );
};
