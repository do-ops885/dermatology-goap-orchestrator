import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentLogEntry } from '../types';
import { CheckCircle2, CircleDashed, Cpu, ShieldCheck } from 'lucide-react';

interface AgentFlowProps {
  logs: AgentLogEntry[];
}

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  // Manual formatting to avoid TS error with fractionalSecondDigits
  const timeStr = date.toLocaleTimeString([], { hour12: false });
  const ms = date.getMilliseconds().toString().padStart(3, '0').slice(0, 2);
  return `${timeStr}.${ms}`;
};

const AgentFlow: React.FC<AgentFlowProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/50 bg-white/30 flex justify-between items-center">
        <h3 className="font-grotesk font-bold text-sm text-stone-700 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-600" />
          GOAP Orchestrator
        </h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-mono text-green-800 font-medium">LIVE</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        <AnimatePresence mode='popLayout'>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative p-3 rounded-lg border text-sm ${
                log.status === 'running' 
                  ? 'bg-blue-50/80 border-blue-200 shadow-sm' 
                  : log.status === 'completed'
                  ? 'bg-white/60 border-stone-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
               {log.status === 'running' && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -left-1 top-4 w-1 h-6 bg-blue-500 rounded-r-full"
                  />
               )}
               
               <div className="flex justify-between items-start mb-1">
                 <span className="font-mono text-[10px] text-stone-400">
                    {formatTimestamp(log.timestamp)}
                 </span>
                 <StatusIcon status={log.status} />
               </div>
               
               <div className="font-medium text-stone-800 font-grotesk">{log.agent}</div>
               <div className="text-stone-600 text-xs mt-0.5">{log.message}</div>
               
               {log.metadata && (
                 <div className="mt-2 p-2 bg-black/5 rounded text-[10px] font-mono text-stone-600 overflow-x-auto">
                    <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                 </div>
               )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-60">
                <CircleDashed className="w-8 h-8 mb-2 animate-spin-slow" />
                <span className="text-xs">Waiting for input...</span>
            </div>
        )}
      </div>
    </div>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'running') return <CircleDashed className="w-4 h-4 text-blue-600 animate-spin" />;
    if (status === 'failed') return <div className="w-4 h-4 text-red-600 font-bold">!</div>;
    return <div className="w-4 h-4 rounded-full border-2 border-stone-300" />;
};

export default AgentFlow;