import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Activity, Database, AlertCircle, AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import React, { useState } from 'react';

import { ModelProgress } from './ModelProgress';


interface AnalysisIntakeProps {
  error: string | null;
  warning: string | null;
  modelProgress: { text: string; percent: number } | null;
  preview: string | null;
  analyzing: boolean;
  dbReady: boolean;
  file: File | null;
  heatmapOverlay?: string;
  onFileChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onExecute: () => void;
  privacyMode?: boolean;
  setPrivacyMode?: (_val: boolean) => void;
}

// Helper: Privacy mode toggle button
const PrivacyToggle: React.FC<{
  privacyMode?: boolean;
  setPrivacyMode?: (_val: boolean) => void;
}> = ({ privacyMode, setPrivacyMode }) => {
  if (typeof setPrivacyMode !== 'function') return null;

  const isPrivate = privacyMode === true;
  const buttonClass = isPrivate
    ? 'bg-stone-800 text-white border-stone-900'
    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200';

  return (
    <button
      onClick={() => { setPrivacyMode(!isPrivate); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${buttonClass}`}
      title="Privacy Mode: Disables Cloud AI agents"
    >
      <Shield className="w-3 h-3" />
      {isPrivate ? 'PRIVACY MODE' : 'CLOUD ENABLED'}
    </button>
  );
};

// Helper: Alert message component
const AlertMessage: React.FC<{
  message: string | null;
  type: 'error' | 'warning';
}> = ({ message, type }) => {
  if (!message) return null;

  const isError = type === 'error';
  const bgColor = isError ? 'bg-red-50' : 'bg-amber-50';
  const borderColor = isError ? 'border-red-100' : 'border-amber-100';
  const textColor = isError ? 'text-red-800' : 'text-amber-800';
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <div className={`p-3 ${bgColor} border ${borderColor} rounded-xl flex items-start gap-2 text-xs ${textColor} animate-in fade-in slide-in-from-top-2`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// Helper: Image preview with heatmap overlay
const ImagePreview: React.FC<{
  preview: string;
  heatmapOverlay?: string;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}> = ({ preview, heatmapOverlay, showHeatmap, onToggleHeatmap }) => (
  <div className="relative w-full h-full">
    <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl opacity-90 shadow-inner" />
    
    <AnimatePresence>
      {heatmapOverlay && showHeatmap && (
        <motion.img 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          src={heatmapOverlay} 
          className="absolute inset-0 w-full h-full object-cover rounded-2xl pointer-events-none mix-blend-multiply"
          alt="AI Attention Map"
        />
      )}
    </AnimatePresence>

    {heatmapOverlay && (
      <button
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleHeatmap(); }}
        className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all z-10"
        title="Toggle AI Focus Heatmap"
      >
        {showHeatmap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    )}
  </div>
);

// Helper: Empty state placeholder
const EmptyPreview: React.FC<{ privacyMode?: boolean }> = ({ privacyMode }) => (
  <div className="text-center p-6">
    <Upload className="w-8 h-8 mx-auto mb-3 text-stone-400 group-hover:text-terracotta-500 transition-colors" />
    <p className="text-sm font-medium text-stone-600">Drop high-res dermatoscopy</p>
    <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-widest font-bold">
      {privacyMode === true ? 'Local Processing Only' : 'Local Encryption Active'}
    </p>
  </div>
);

// Helper: Get button content based on state
const getButtonContent = (analyzing: boolean, dbReady: boolean): React.ReactNode => {
  if (analyzing) {
    return <><Activity className="w-4 h-4 animate-spin" /> Orchestrating Agents...</>;
  }
  if (!dbReady) {
    return <><Database className="w-4 h-4 animate-pulse" /> Syncing Ledger...</>;
  }
  return 'Run Clinical Analysis';
};

// Helper: Get button class based on state
const getButtonClass = (file: File | null, analyzing: boolean, dbReady: boolean): string => {
  const isDisabled = !file || analyzing || !dbReady;
  const baseClass = 'w-full py-4 rounded-xl font-grotesk font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2';
  const disabledClass = 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-200';
  const enabledClass = 'bg-terracotta-600 text-white hover:bg-terracotta-700 shadow-lg shadow-terracotta-600/30 hover:shadow-terracotta-600/40 active:scale-[0.98] ring-2 ring-offset-2 ring-transparent hover:ring-terracotta-200';
  
  return `${baseClass} ${isDisabled ? disabledClass : enabledClass}`;
};

export const AnalysisIntake: React.FC<AnalysisIntakeProps> = ({
  error,
  warning,
  modelProgress,
  preview,
  analyzing,
  dbReady,
  file,
  heatmapOverlay,
  onFileChange,
  onExecute,
  privacyMode,
  setPrivacyMode
}) => {
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold font-grotesk text-stone-800">Analysis Intake</h2>
        <PrivacyToggle privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
      </div>
      
      <AlertMessage message={error} type="error" />
      <AlertMessage message={warning} type="warning" />

      <div className="relative group border-2 border-dashed border-stone-200 rounded-2xl h-64 flex flex-col items-center justify-center transition-all bg-white/40 hover:bg-white/60 hover:border-terracotta-300 overflow-hidden">
        {preview ? (
          <ImagePreview 
            preview={preview} 
            heatmapOverlay={heatmapOverlay} 
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => { setShowHeatmap(!showHeatmap); }}
          />
        ) : (
          <EmptyPreview privacyMode={privacyMode} />
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
        className={getButtonClass(file, analyzing, dbReady)}
      >
        {getButtonContent(analyzing, dbReady)}
      </button>

      <ModelProgress progress={modelProgress} />
    </div>
  );
};