import React from 'react';
import { Lock, Fingerprint, MessageSquareText, Share2, Gauge, History } from 'lucide-react';

interface DiagnosticSummaryProps {
  result: any | null;
}

export const DiagnosticSummary: React.FC<DiagnosticSummaryProps> = ({ result }) => {
  return (
    <div className={`glass-panel p-6 rounded-2xl flex-1 transition-all duration-700 flex flex-col ${result ? 'opacity-100 scale-100' : 'opacity-40 scale-95 pointer-events-none'}`}>
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-lg font-bold font-grotesk text-stone-800">Diagnostic Summary</h2>
                <p className="text-[10px] text-stone-400 font-mono tracking-tighter uppercase">FairDisCo Disentangled</p>
            </div>
            <Lock className="w-4 h-4 text-terracotta-600" />
        </div>
        
        {result ? (
            <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">Classification</span>
                        <div className="text-xl font-bold font-grotesk text-stone-900">Type {result.type}</div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-mono uppercase text-stone-400">Detection Confidence</span>
                            <span className={`text-[10px] font-bold font-mono ${result.confidence < 0.65 ? 'text-amber-600' : 'text-green-600'}`}>
                              {(result.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                              <div 
                                  className={`h-full transition-all duration-1000 ${result.confidence < 0.65 ? 'bg-amber-500' : 'bg-green-500'}`} 
                                  style={{ width: `${result.confidence * 100}%` }} 
                              />
                          </div>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2">Fairness Guard</span>
                        <div className="text-xl font-bold font-grotesk text-stone-900">
                          {result.fairness ? (result.fairness * 100).toFixed(0) : '0'}%
                        </div>
                        <span className="text-[9px] text-stone-400 mt-1 flex items-center gap-1"><Fingerprint className="w-2.5 h-2.5" /> Bias Invariant</span>
                    </div>
                </div>

                {result.reasoning && (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                     <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                        <MessageSquareText className="w-3 h-3" /> Agent Reasoning
                     </span>
                     <p className="text-[11px] text-stone-600 leading-relaxed font-mono italic">
                        "{result.reasoning}"
                     </p>
                  </div>
                )}
                
                {result.similarCases && result.similarCases.length > 0 && (
                   <div className="p-4 bg-terracotta-50/50 rounded-2xl border border-terracotta-100">
                      <span className="text-[10px] text-terracotta-800 uppercase font-bold tracking-widest block mb-2 flex items-center gap-1">
                         <History className="w-3 h-3" /> Similar Clinical Patterns
                      </span>
                      <div className="space-y-2">
                         {result.similarCases.map((match: any, i: number) => (
                             <div key={i} className="flex justify-between items-start text-[10px] border-b border-terracotta-100 pb-1 last:border-0 last:pb-0">
                                <div>
                                   <div className="font-semibold text-terracotta-900">{match.outcome}</div>
                                   <div className="text-terracotta-700/70">{match.context.split(',')[0]}</div>
                                </div>
                                <div className="font-mono text-terracotta-600 opacity-70">
                                   Sim: {(match.score * 100).toFixed(0)}%
                                </div>
                             </div>
                         ))}
                      </div>
                   </div>
                )}

                <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-3">Recommendation</span>
                    <p className="text-sm text-stone-700 leading-relaxed font-serif italic border-l-2 border-terracotta-300 pl-4">
                        "{result.recommendations ? result.recommendations[0] : 'Consult a healthcare professional for follow-up.'}"
                    </p>
                </div>

                <button className="w-full py-3 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 mt-auto">
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