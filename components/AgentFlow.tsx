import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentLogEntry } from '../types';
import { CheckCircle2, CircleDashed, Cpu, ShieldCheck, Activity } from 'lucide-react';

interface AgentFlowProps {
  logs: AgentLogEntry[];
}

// Format timestamp utility
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString([], { hour12: false });
  const ms = date.getMilliseconds().toString().padStart(3, '0').slice(0, 2);
  return `${timeStr}.${ms}`;
};

const AgentFlow = forwardRef<HTMLDivElement, AgentFlowProps>(({ logs }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
        ref={containerRef}
        className="glass-panel rounded-xl h-full flex flex-col overflow-hidden outline-none ring-offset-2 focus:ring-2 focus:ring-blue-400"
        tabIndex={-1} // Allow programmatic focus
        aria-label="Agent Reasoning Log"
    >
      <div className="p-4 border-b border-white/50 bg-white/30 flex justify-between items-center">
        <h3 className="font-grotesk font-bold text-sm text-stone-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-600" />
          Agent Reasoning Stream
        </h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-mono text-green-800 font-medium">LIVE</span>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3" 
        ref={scrollRef}
        role="log" 
        aria-live="polite"
        aria-atomic="false"
      >
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
               
               {log.metadata && Object.keys(log.metadata).length > 0 && (
                 <div className="mt-2 grid grid-cols-2 gap-1">
                    {Object.entries(log.metadata).map(([key, val]) => (
                        <div key={key} className="bg-white/50 px-2 py-1 rounded text-[9px] border border-stone-100/50 flex flex-col">
                            <span className="text-stone-400 uppercase tracking-wider text-[8px] mb-0.5">{key}</span>
                            <span className="font-mono text-stone-700 truncate" title={String(val)}>
                                {typeof val === 'object' ? '...' : String(val)}
                            </span>
                        </div>
                    ))}
                 </div>
               )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-60">
                <CircleDashed className="w-8 h-8 mb-2 animate-spin-slow" />
                <span className="text-xs">Waiting for clinical data...</span>
            </div>
        )}
      </div>
    </div>
  );
});

const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'running') return <CircleDashed className="w-4 h-4 text-blue-600 animate-spin" />;
    if (status === 'failed') return <div className="w-4 h-4 text-red-600 font-bold">!</div>;
    return <div className="w-4 h-4 rounded-full border-2 border-stone-300" />;
};

export default AgentFlow;