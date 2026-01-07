import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { WorldState } from '../types';

interface PatientSafetyStateProps {
  worldState: WorldState;
}

export const PatientSafetyState: React.FC<PatientSafetyStateProps> = ({ worldState }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-sm font-bold font-grotesk mb-4 text-stone-500 uppercase tracking-widest flex items-center justify-between">
          Patient Safety State
          {worldState.is_low_confidence && (
            <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">SAFETY_CALIBRATION_ACTIVE</span>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-2">
            {Object.entries(worldState).map(([key, value]) => {
                if (typeof value !== 'boolean') return null;
                return (
                    <div key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[10px] font-mono transition-all
                        ${value ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>
                        {value ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-stone-200" />}
                        <span className="truncate">{key.replace(/_/g, ' ')}</span>
                    </div>
                )
            })}
        </div>
    </div>
  );
};