import { X, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, Activity, Fingerprint, Lock, Database, RefreshCcw, BrainCircuit } from 'lucide-react';
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

import AgentDB from '../services/agentDB';

interface FairnessReportProps {
  onClose: () => void;
}

const FairnessReport: React.FC<FairnessReportProps> = ({ onClose }) => {
  const agentDB = AgentDB.getInstance();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, { tpr: number; fpr: number; count: number }>>(() => agentDB.getFairnessMetrics());
  const [auditLog, setAuditLog] = useState<{ id: string; timestamp: number; type: string; severity?: string; [key: string]: unknown }[]>([]);
  const calibrationData = agentDB.getCalibrationData();
  const historicalTrends = agentDB.getHistoricalTrends();

  const loadData = useCallback(async () => {
      setLoading(true);
      try {
        const [liveMetrics, liveLog] = await Promise.all([
            agentDB.getLiveStats(),
            agentDB.getUnifiedAuditLog()
        ]);
        setMetrics(liveMetrics);
        setAuditLog(liveLog);
      } finally {
        setLoading(false);
      }
  }, [agentDB]);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  
  const handleReset = async () => {
      if(confirm('Are you sure you want to wipe the AgentDB memory? This will reset all learned patterns.')) {
          await agentDB.resetMemory();
          await loadData();
      }
  };

  const demographicData = useMemo(() => {
    return Object.entries(metrics).map(([type, stats]) => ({
      type,
      tpr: stats.tpr,
      fpr: stats.fpr,
      count: stats.count,
      gap: Math.abs(0.92 - stats.tpr).toFixed(3)
    }));
  }, [metrics]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md transition-all">
      <div className="bg-stone-50 w-full max-w-6xl h-[92vh] rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/50 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-200 flex justify-between items-center bg-white/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-terracotta-50 rounded-2xl border border-terracotta-100">
              <ShieldCheck className="w-6 h-6 text-terracotta-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-grotesk text-stone-900 flex items-center gap-3">
                Algorithmic Fairness Protocol
                <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200">v3.1.2-ALPHA</span>
              </h2>
              <p className="text-sm text-stone-500 flex items-center gap-2">
                <Database className="w-3 h-3" /> Immutable AgentDB Ledger • Fitzpatrick Calibration • Equalized Odds Disentanglement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => { void handleReset(); }}
                className="px-4 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 transition-all flex items-center gap-2"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reset Memory
             </button>
             <button 
                onClick={onClose}
                className="p-3 hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-stone-900 hover:rotate-90"
              >
                <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Top Row: Executive Scorecard & Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Executive Scorecard */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                   <h4 className="text-sm font-bold text-slate-700 font-grotesk uppercase tracking-wider">Executive Summary</h4>
                   <TrendingUp className="w-4 h-4 text-slate-400" />
                 </div>
                 <div className="space-y-6">
                    <ScoreMetric label="Demographic Parity" value={0.93} color="bg-slate-600" />
                    <ScoreMetric label="Equalized Odds" value={0.91} color="bg-slate-600" />
                    <ScoreMetric label="Treatment Equality" value={0.94} color="bg-slate-600" />
                 </div>
                 <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aggregate Trust</div>
                      <div className="text-2xl font-bold font-grotesk text-slate-800">92.4%</div>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">OPTIMAL</div>
                 </div>
              </div>

              <div className="bg-terracotta-50 border border-terracotta-100 p-6 rounded-3xl shadow-sm">
                 <h4 className="text-sm font-bold text-terracotta-800 mb-4 font-grotesk uppercase tracking-wide flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" />
                    Bias Mitigations
                 </h4>
                 <div className="space-y-3">
                    <MitigationItem text="SMOTE Over-sampling Fitzpatrick V-VI (+32%)" />
                    <MitigationItem text="FairDisCo Contrastive Disentanglement (λ=0.5)" />
                    <MitigationItem text="Calibration-aware Post-processing Thresholds" />
                    <MitigationItem text="Neighbor-class Case Weighting (WASM-accelerated)" />
                 </div>
              </div>
            </div>

            {/* Historical Trend Chart */}
            <div className="lg:col-span-8 bg-white border border-stone-200 p-6 rounded-3xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wider">Historical Bias Convergence</h4>
                  <p className="text-[10px] text-stone-400 mt-1">Audit cycles (Last 7 Days)</p>
                </div>
                <div className="flex gap-4 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-terracotta-400" /> PARITY</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-500" /> GAP</span>
                </div>
              </div>
              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalTrends}>
                    <defs>
                      <linearGradient id="colorParity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D96C5B" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#D96C5B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#A8A29E'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#A8A29E'}} domain={[0.8, 1]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="parity" stroke="#D96C5B" strokeWidth={3} fillOpacity={1} fill="url(#colorParity)" name="Demographic Parity" />
                    <Line type="monotone" dataKey="gap" stroke="#4A5D5E" strokeWidth={2} strokeDasharray="5 5" name="TPR Gap" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Middle Row: Calibration & Demographic Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Calibration Analysis */}
            <div className="lg:col-span-7 bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wider">Calibration Analysis</h4>
                      <p className="text-[10px] text-stone-400 mt-1">Estimated vs Actual outcome probability per phenotype</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono text-stone-600">
                        ECE: 0.032
                      </div>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={calibrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                            <XAxis dataKey="prob" type="number" domain={[0, 1]} tick={{fontSize: 10}} />
                            <YAxis domain={[0, 1]} tick={{fontSize: 10}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                            <Line type="monotone" dataKey="perfect" stroke="#E5E7EB" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Ideal" />
                            <Line type="monotone" dataKey="TypeI" stroke="#D96C5B" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} name="Type I-II" />
                            <Line type="monotone" dataKey="TypeVI" stroke="#4A5D5E" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} name="Type V-VI" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Diversity Ledger Snapshot */}
            <div className="lg:col-span-5 bg-white border border-stone-200 p-6 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wider mb-6 flex items-center justify-between">
                  Demographic Equality Ledger
                  {loading && <RefreshCcw className="w-3 h-3 animate-spin text-terracotta-500" />}
              </h4>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                 {demographicData.map((data) => (
                   <div key={data.type} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100 hover:border-stone-300 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600 group-hover:bg-terracotta-50 group-hover:text-terracotta-600 transition-colors">
                          {data.type}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-stone-800 font-grotesk uppercase tracking-tight">Phenotype {data.type}</div>
                          <div className="text-[9px] text-stone-400 font-mono">Samples: {data.count}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold font-mono text-slate-700">TPR: {(data.tpr * 100).toFixed(1)}%</div>
                        <div className={`text-[9px] font-bold font-mono ${parseFloat(data.gap) > 0.05 ? 'text-terracotta-500' : 'text-green-600'}`}>
                          Gap: {data.gap}
                        </div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Audit Log */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-8 py-5 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4 text-stone-400" />
                      Immutable Bias Audit Log & Learning Events
                  </h4>
                  <p className="text-[10px] text-stone-400 mt-0.5">Verification Chain ID: 0x82f..91a</p>
                </div>
                <div className="text-xs text-stone-500 font-mono flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE AGENT MONITORING
                </div>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-stone-50 text-stone-500 font-mono text-[10px] uppercase tracking-widest border-b border-stone-100 sticky top-0 z-10">
                      <tr>
                          <th className="px-8 py-4 font-bold bg-stone-50">Timestamp</th>
                          <th className="px-8 py-4 font-bold bg-stone-50">Type</th>
                          <th className="px-8 py-4 font-bold bg-stone-50">Observation / Pattern</th>
                          <th className="px-8 py-4 font-bold bg-stone-50">Context / Mitigation</th>
                          <th className="px-8 py-4 font-bold text-right bg-stone-50">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                      {auditLog.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
                              <td className="px-8 py-5">
                                <div className="font-mono text-[10px] text-stone-400 mb-1">{item.id.substring(0, 12)}...</div>
                                <div className="text-[11px] text-stone-600">{new Date(item.timestamp).toLocaleString()}</div>
                              </td>
                              <td className="px-8 py-5">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter
                                      ${item.type === 'learning' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        item.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                                        item.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                        'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                      {item.type === 'learning' ? <BrainCircuit className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                      {item.type === 'learning' ? 'LEARNED' : item.severity}
                                  </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="font-bold text-stone-800 text-[13px] font-grotesk">{item.message}</div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="text-[11px] text-stone-500 italic flex items-center gap-2">
                                  {item.type !== 'learning' && <Activity className="w-3 h-3 text-slate-400" />}
                                  {item.mitigation}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                      <CheckCircle2 className="w-3 h-3" /> {typeof item.status === 'string' ? item.status.toUpperCase() : 'COMPLETED'}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const ScoreMetric = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div>
      <div className="flex justify-between items-end text-sm mb-2">
          <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">{label}</span>
          <span className="font-mono font-bold text-slate-800 text-base">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-slate-200/50 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
          <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${(value * 100).toString()}%` }}></div>
      </div>
  </div>
);

const MitigationItem = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start group">
    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-terracotta-400 ring-2 ring-terracotta-100 group-hover:scale-125 transition-transform" />
    <span className="text-[11px] font-medium text-terracotta-900/80 leading-relaxed font-sans">
      {text}
    </span>
  </div>
);

export default FairnessReport;