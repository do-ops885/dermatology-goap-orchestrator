import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import AgentDB from '../services/agentDB';

interface FairnessReportProps {
  onClose: () => void;
}

const FairnessReport: React.FC<FairnessReportProps> = ({ onClose }) => {
  const agentDB = AgentDB.getInstance();
  const alerts = agentDB.getBiasAlerts();
  const calibrationData = agentDB.getCalibrationData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-sm">
      <div className="bg-[#FDFCF8] w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/50 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-white/50">
          <div>
            <h2 className="text-xl font-bold font-grotesk text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-terracotta-600" />
              Algorithmic Fairness Audit
            </h2>
            <p className="text-sm text-stone-500">
              AgentDB Immutable Ledger • Fitzpatrick I-VI Calibration • Equalized Odds
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Scorecard */}
            <div className="col-span-1 space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
                 <h4 className="text-sm font-bold text-slate-700 mb-4 font-grotesk uppercase tracking-wide">Model Scorecard</h4>
                 <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Demographic Parity</span>
                            <span className="font-mono font-bold text-slate-800">0.93</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-600 w-[93%]"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Equalized Odds</span>
                            <span className="font-mono font-bold text-slate-800">0.91</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-600 w-[91%]"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Predictive Equality</span>
                            <span className="font-mono font-bold text-slate-800">0.94</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-600 w-[94%]"></div>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl">
                 <h4 className="text-sm font-bold text-orange-800 mb-2 font-grotesk uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Active Mitigations
                 </h4>
                 <ul className="text-xs space-y-2 text-orange-900/80">
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        SMOTE resampling active for Fitzpatrick V-VI (+30%)
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        FairDisCo disentanglement enabled (λ=0.5)
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        Post-processing threshold adjustment active
                    </li>
                 </ul>
              </div>
            </div>

            {/* Calibration Plot */}
            <div className="col-span-1 lg:col-span-2 bg-white border border-stone-200 p-5 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wide">
                        Calibration Curves (Predicted vs Actual)
                    </h4>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full">
                        Mean Calibration Error: 0.032
                    </span>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={calibrationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="prob" 
                                type="number" 
                                domain={[0, 1]} 
                                tick={{fontSize: 12}} 
                                label={{ value: 'Predicted Probability', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                            />
                            <YAxis 
                                domain={[0, 1]} 
                                tick={{fontSize: 12}} 
                                label={{ value: 'Observed Fraction', angle: -90, position: 'insideLeft', fontSize: 12 }}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                            />
                            <Legend verticalAlign="top" height={36} iconType="plainline" />
                            {/* Perfect Calibration Reference */}
                            <Line 
                                type="monotone" 
                                dataKey="perfect" 
                                stroke="#9CA3AF" 
                                strokeDasharray="5 5" 
                                strokeWidth={1} 
                                dot={false} 
                                name="Ideal Calibration" 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="TypeI" 
                                stroke="#D96C5B" 
                                strokeWidth={2} 
                                dot={{r: 3}} 
                                name="Fitzpatrick I" 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="TypeVI" 
                                stroke="#4A5D5E" 
                                strokeWidth={2} 
                                dot={{r: 3}} 
                                name="Fitzpatrick VI" 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* Bias Audit Log Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-700 font-grotesk uppercase tracking-wide">
                    Bias Audit Log
                </h4>
                <div className="text-xs text-stone-500 font-mono">
                    Last Audit: {new Date().toLocaleDateString()}
                </div>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-stone-50 text-stone-500 font-mono text-xs uppercase">
                    <tr>
                        <th className="px-6 py-3 font-medium">Alert ID</th>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">Severity</th>
                        <th className="px-6 py-3 font-medium">Message</th>
                        <th className="px-6 py-3 font-medium">Mitigation</th>
                        <th className="px-6 py-3 font-medium text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                    {alerts.map((alert) => (
                        <tr key={alert.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-stone-500">{alert.id}</td>
                            <td className="px-6 py-4 text-stone-600">
                                {new Date(alert.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                    ${alert.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                                      alert.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    {alert.severity === 'high' && <AlertTriangle className="w-3 h-3" />}
                                    {alert.severity}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-stone-800">{alert.message}</td>
                            <td className="px-6 py-4 text-stone-600 italic">{alert.mitigation}</td>
                            <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                                    <CheckCircle2 className="w-3 h-3" /> {alert.status}
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
  );
};

export default FairnessReport;