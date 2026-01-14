import { motion, AnimatePresence } from 'framer-motion';
import React, { useMemo } from 'react';

import type { ExecutionTrace, ExecutionAgentRecord } from '../services/goap/agent';

interface TraceTimelineProps {
  trace: ExecutionTrace | null;
  currentAgent?: string;
  height?: number;
}

const getStatusColor = (status: ExecutionAgentRecord['status']): string => {
  switch (status) {
    case 'running':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'skipped':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ trace, currentAgent, height = 80 }) => {
  const { bars, totalDuration } = useMemo(() => {
    if (!trace) return { bars: [], totalDuration: 0 };

    const startTime = trace.startTime;
    const endTime = trace.endTime ?? trace.startTime + 1;
    const duration = endTime - startTime;
    const totalDuration = Math.max(duration, 1);

    const bars = trace.agents.map((agent, index) => {
      const agentStart = ((agent.startTime - startTime) / totalDuration) * 100;
      const agentEnd = ((agent.endTime ?? endTime) - startTime) / totalDuration * 100;
      const width = Math.max(agentEnd - agentStart, 1);

      return {
        ...agent,
        left: agentStart,
        width,
        top: index * 20 + 8,
      };
    });

    return { bars, totalDuration };
  }, [trace]);

  if (!trace) {
    return (
      <div className="glass-panel rounded-lg p-4 h-[80px] flex items-center justify-center text-stone-400 text-xs">
        No trace data available
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-3 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Timeline</span>
        <span className="text-[9px] font-mono text-stone-400">
          {(totalDuration / 1000).toFixed(2)}s total
        </span>
      </div>
      
      <div 
        className="relative rounded bg-stone-100 border border-stone-200 overflow-hidden"
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 border-r border-stone-200/50"
              style={{ marginLeft: i === 0 ? 0 : undefined }}
            />
          ))}
        </div>
        
        <AnimatePresence>
          {bars.map((bar) => (
            <motion.div
              key={bar.id}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ 
                opacity: 1, 
                scaleX: 1,
                left: `${bar.left.toString()}%`,
                width: `${bar.width.toString()}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`absolute h-4 rounded-full cursor-pointer transition-all ${
                bar.agentId === currentAgent 
                  ? 'ring-2 ring-blue-400 ring-offset-1 z-10' 
                  : ''
              } ${getStatusColor(bar.status)}`}
              style={{ top: bar.top }}
              title={`${bar.name ?? bar.agentId}: ${bar.status} (${bar.width.toFixed(1)}%)`}
            >
              {bar.width > 8 && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[8px] font-medium text-white truncate pointer-events-none">
                  {bar.name?.split('-')[0] ?? bar.agentId.split('-')[0]}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between mt-1 text-[9px] text-stone-400 font-mono">
        <span>{new Date(trace.startTime).toLocaleTimeString([], { hour12: false })}</span>
        <span>{trace.endTime !== undefined ? new Date(trace.endTime).toLocaleTimeString([], { hour12: false }) : 'now'}</span>
      </div>
    </div>
  );
};

export default TraceTimeline;
