import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Loader2 } from 'lucide-react';


interface ModelProgressProps {
  progress: { text: string; percent: number } | null;
}

export function ModelProgress({ progress }: ModelProgressProps) {
  return (
    <AnimatePresence>
      {progress && (
        <motion.div
          layout
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-terracotta-50 rounded-md border border-terracotta-100">
                  <BrainCircuit className="w-3.5 h-3.5 text-terracotta-600" />
                </div>
                <div>
                  <div className="text-[10px] font-bold font-grotesk text-stone-700 uppercase tracking-wider">
                    Offline AI Engine
                  </div>
                  <div className="text-[9px] text-stone-400 font-mono">
                    Downloading SmolLM2-1.7B
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-terracotta-600">
                  {progress.percent.toString()}%
                </span>
                {progress.percent < 100 ? (
                  <Loader2 className="w-3 h-3 text-stone-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                )}
              </div>
            </div>

            <div className="h-1.5 bg-stone-200/60 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-terracotta-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent.toString()}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </div>

            <p className="text-[9px] text-stone-400 font-mono truncate">{progress.text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
