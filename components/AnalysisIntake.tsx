import React from 'react';
import { Upload, Activity, Database, AlertCircle, AlertTriangle } from 'lucide-react';

interface AnalysisIntakeProps {
  error: string | null;
  warning: string | null;
  preview: string | null;
  analyzing: boolean;
  dbReady: boolean;
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExecute: () => void;
}

export const AnalysisIntake: React.FC<AnalysisIntakeProps> = ({
  error,
  warning,
  preview,
  analyzing,
  dbReady,
  file,
  onFileChange,
  onExecute
}) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
       <h2 className="text-lg font-bold font-grotesk text-stone-800">Analysis Intake</h2>
       
       {error && (
         <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-800 animate-in fade-in slide-in-from-top-2">
           <AlertCircle className="w-4 h-4 flex-shrink-0" />
           <span>{error}</span>
         </div>
       )}

       {warning && (
         <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-xs text-amber-800 animate-in fade-in slide-in-from-top-2">
           <AlertTriangle className="w-4 h-4 flex-shrink-0" />
           <span>{warning}</span>
         </div>
       )}

       <div className="relative group border-2 border-dashed border-stone-200 rounded-2xl h-64 flex flex-col items-center justify-center transition-all bg-white/40 hover:bg-white/60 hover:border-terracotta-300">
          {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl opacity-90 shadow-inner" />
          ) : (
              <div className="text-center p-6">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-stone-400 group-hover:text-terracotta-500 transition-colors" />
                  <p className="text-sm font-medium text-stone-600">Drop high-res dermatoscopy</p>
                  <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-widest font-bold">Local Encryption Active</p>
              </div>
          )}
          <input 
              type="file" 
              onChange={onFileChange} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept="image/jpeg, image/png, image/webp"
              disabled={analyzing}
          />
       </div>
       
       <button
          onClick={onExecute}
          disabled={!file || analyzing || !dbReady}
          className={`w-full py-4 rounded-xl font-grotesk font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
              ${!file || analyzing || !dbReady 
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200' 
                  : 'bg-terracotta-600 text-white hover:bg-terracotta-700 shadow-lg shadow-terracotta-600/30 hover:shadow-terracotta-600/40 active:scale-[0.98] ring-2 ring-offset-2 ring-transparent hover:ring-terracotta-200'
              }`}
       >
          {analyzing ? (
            <><Activity className="w-4 h-4 animate-spin" /> Orchestrating Agents...</>
          ) : !dbReady ? (
            <><Database className="w-4 h-4 animate-pulse" /> Syncing Ledger...</>
          ) : (
            'Run Clinical Analysis'
          )}
       </button>
    </div>
  );
};