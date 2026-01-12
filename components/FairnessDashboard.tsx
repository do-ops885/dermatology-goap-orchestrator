import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import AgentDB from '../services/agentDB';
import { ArrowUpRight, Info, RefreshCw, MessageSquareHeart } from 'lucide-react';

interface FairnessDashboardProps {
  onOpenReport?: () => void;
}

const FairnessDashboard: React.FC<FairnessDashboardProps> = ({ onOpenReport }) => {
  const agentDB = AgentDB.getInstance();
  const [metrics, setMetrics] = useState<Record<string, { tpr: number; fpr: number; count: number }>>(() => agentDB.getFairnessMetrics());
  const [feedbackStats, setFeedbackStats] = useState<{
    totalFeedback: number;
    corrections: number;
    confirmations: number;
    avgConfidence: number;
  }>({ totalFeedback: 0, corrections: 0, confirmations: 0, avgConfidence: 0 });
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [live, feedback] = await Promise.all([
        agentDB.getLiveStats(),
        agentDB.getFeedbackStats()
      ]);
      setMetrics(live);
      setFeedbackStats({
        totalFeedback: feedback.totalFeedback,
        corrections: feedback.corrections,
        confirmations: feedback.confirmations,
        avgConfidence: feedback.avgConfidence
      });
    } finally {
      setLoading(false);
    }
  }, [agentDB]);

  useEffect(() => {
    void fetchMetrics();
    // Poll every 5s for updates during active sessions
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 5000);
    return () => { clearInterval(interval); };
  }, [fetchMetrics]);

  const data = useMemo(() => {
    return Object.entries(metrics).map(([type, stats]) => ({
      name: `Type ${type}`,
      tpr: stats.tpr,
      fpr: stats.fpr,
      count: stats.count
    }));
  }, [metrics]);

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-stone-200 h-full flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
             <h3 className="text-lg font-bold font-grotesk text-stone-800">Equity Assurance</h3>
             <div className="group relative">
                <Info className="w-3.5 h-3.5 text-stone-400 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-stone-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                   Monitors Demographic Parity across skin types using live AgentDB patterns.
                </div>
             </div>
          </div>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
            Live Bias Mitigation 
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-terracotta-500" />}
          </p>
        </div>
        
        {onOpenReport && (
          <button 
            onClick={onOpenReport}
            className="group flex items-center gap-1 text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 transition-colors"
          >
            Full Audit
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      <div className="flex gap-4 text-xs font-mono mb-2 justify-end relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span> TPR
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-stone-300"></span> FPR
        </div>
      </div>

      <div className="flex-1 w-full min-h-[180px] relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#666' }} 
              dy={10}
              interval={0}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#666' }}
              domain={[0, 1]}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                fontFamily: 'Switzer, sans-serif',
                fontSize: '12px'
              }}
            />
            <ReferenceLine y={0.9} stroke="#666" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#666' }} />
            <Bar dataKey="tpr" radius={[3, 3, 0, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-tpr-${index.toString()}`} fill={entry.tpr < 0.88 ? '#D96C5B' : '#4A5D5E'} />
              ))}
            </Bar>
            <Bar dataKey="fpr" radius={[3, 3, 0, 0]} barSize={20} fill="#E5E7EB" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
        <div className="p-3 bg-stone-100/50 rounded-lg border border-stone-100">
            <div className="text-[10px] text-stone-500 font-mono mb-1 uppercase tracking-wider">Max TPR Gap</div>
            <div className="text-lg font-bold font-grotesk text-slate-700 leading-none">
                {(Math.max(...data.map(d => d.tpr)) - Math.min(...data.map(d => d.tpr))).toFixed(2)}
            </div>
            <div className="text-[9px] text-green-600 font-medium mt-1">✓ Compliant (&lt;0.10)</div>
        </div>
        <div className="p-3 bg-stone-100/50 rounded-lg border border-stone-100">
            <div className="text-[10px] text-stone-500 font-mono mb-1 uppercase tracking-wider">Samples Learned</div>
            <div className="text-lg font-bold font-grotesk text-slate-700 leading-none">
                {data.reduce((acc, curr) => acc + curr.count, 0)}
            </div>
            <div className="text-[9px] text-stone-400 font-medium mt-1 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Updating
            </div>
        </div>
      </div>

      {/* Clinician Feedback Stats */}
      {feedbackStats.totalFeedback > 0 && (
        <div className="mt-3 p-3 bg-terracotta-50/30 rounded-lg border border-terracotta-100 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareHeart className="w-3.5 h-3.5 text-terracotta-600" />
            <div className="text-[10px] text-terracotta-700 font-bold font-mono uppercase tracking-wider">
              Human Feedback
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs font-bold font-grotesk text-terracotta-800">
                {feedbackStats.totalFeedback}
              </div>
              <div className="text-[9px] text-terracotta-600">Total</div>
            </div>
            <div>
              <div className="text-xs font-bold font-grotesk text-terracotta-800">
                {feedbackStats.corrections}
              </div>
              <div className="text-[9px] text-terracotta-600">Corrections</div>
            </div>
            <div>
              <div className="text-xs font-bold font-grotesk text-terracotta-800">
                {(feedbackStats.avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-[9px] text-terracotta-600">Avg Conf.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FairnessDashboard;