import { CheckCircle2, AlertTriangle } from 'lucide-react';
import React from 'react';

import type { WorldState } from '../types';

interface PatientSafetyStateProps {
  worldState: WorldState;
}

export const PatientSafetyState: React.FC<PatientSafetyStateProps> = ({ worldState }) => {
  // Separate metrics for dedicated display
  const metrics = Object.entries(worldState).filter(([, v]) => typeof v === 'number');
  const flags = Object.entries(worldState).filter(([, v]) => typeof v === 'boolean');

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <h2 className="text-sm font-bold font-grotesk mb-4 text-stone-500 uppercase tracking-widest flex items-center justify-between">
        Patient Safety State
        {worldState.is_low_confidence && (
          <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            SAFETY_CALIBRATION_ACTIVE
          </span>
        )}
      </h2>

      {/* Numeric Metrics Display */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-stone-50/50 rounded-xl border border-stone-100">
          {metrics.map(([key, value]) => {
            const val = value as number;
            // Color logic for scores
            let color = 'bg-blue-500';
            let bg = 'bg-blue-50 text-blue-700 border-blue-100';

            if (key === 'confidence_score') {
              if (val < 0.65) {
                color = 'bg-amber-500';
                bg = 'bg-amber-50 text-amber-700 border-amber-200';
              } else {
                color = 'bg-green-500';
                bg = 'bg-green-50 text-green-700 border-green-200';
              }
            } else if (key === 'fairness_score' && val < 0.8) {
              color = 'bg-terracotta-500';
              bg = 'bg-terracotta-50 text-terracotta-700 border-terracotta-200';
            }

            return (
              <div
                key={key}
                className={`flex flex-col gap-1.5 p-2 rounded-lg border text-[10px] font-mono ${bg}`}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate opacity-80 uppercase tracking-tighter">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold">{(val * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/50 rounded-full overflow-hidden w-full">
                  <div
                    className={`h-full ${color} transition-all duration-700`}
                    style={{ width: `${(val * 100).toString()}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Boolean Flags Grid */}
      <div className="grid grid-cols-2 gap-2">
        {flags.map(([key, value]) => {
          const isActive = value as boolean;
          return (
            <div
              key={key}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[10px] font-mono transition-all
                        ${isActive ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-stone-50 border-stone-100 text-stone-400 opacity-60'}`}
            >
              {isActive ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-stone-200" />
              )}
              <span className="truncate">{key.replace(/_/g, ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
