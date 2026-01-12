import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Activity, 
  ChevronRight
} from 'lucide-react';
import type { ExecutionTrace } from '../services/goap/agent';

interface AgentFlowProps {
  trace: ExecutionTrace | null;
  currentAgent?: string;
}

export const AgentFlow = React.forwardRef<HTMLDivElement, AgentFlowProps>(({ trace, currentAgent }, ref) => {
  useEffect(() => {
    if (currentAgent !== undefined && currentAgent !== '' && typeof ref === 'object' && ref !== null && ref.current !== null) {
      const element = ref.current.querySelector(`[data-agent="${currentAgent}"]`);
      if (element !== null) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentAgent, ref]);

  if (!trace) {
    return (
      <div className="glass-panel rounded-xl p-6 h-full flex flex-col items-center justify-center text-stone-400">
        <Activity className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm">Waiting for execution trace...</p>
      </div>
    );
  }

  const completedCount = trace.agents.filter(a => a.status === 'completed').length;
  const failedCount = trace.agents.filter(a => a.status === 'failed').length;
  const skippedCount = trace.agents.filter(a => a.status === 'skipped').length;
  const runningCount = trace.agents.filter(a => a.status === 'running').length;

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/50 bg-white/30">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-grotesk font-bold text-sm text-stone-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            Execution Trace
          </h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-green-800 font-medium">RUN {trace.runId}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-stone-500">
          <span>Started: {formatTime(trace.startTime)}</span>
          <span className="font-mono">Total: {formatDuration(trace.startTime, trace.endTime)}</span>
        </div>
      </div>

      <div 
        ref={ref}
        className="flex-1 overflow-y-auto p-4 relative"
        role="log" 
        aria-live="polite"
      >
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-stone-200" />
        
        <AnimatePresence mode="popLayout">
          {trace.agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              data-agent={agent.agentId}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`relative pl-10 pr-3 py-3 mb-2 rounded-lg border transition-all ${
                agent.agentId === currentAgent 
                  ? 'bg-blue-50/80 border-blue-200 shadow-sm' 
                  : agent.status === 'running'
                  ? 'bg-white border-stone-200 shadow-sm'
                  : agent.status === 'failed'
                  ? 'bg-red-50/50 border-red-100'
                  : agent.status === 'skipped'
                  ? 'bg-yellow-50/50 border-yellow-100'
                  : 'bg-white/60 border-stone-100'
              }`}
            >
              {agent.agentId === currentAgent && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                />
              )}
              
              <div className="absolute left-[11px] top-1/2 -translate-y-1/2 z-10">
                <StatusIcon status={agent.status} className="w-5 h-5" />
              </div>
              
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-stone-800 font-grotesk truncate">
                      {agent.name ?? agent.agentId}
                    </span>
                    <StatusBadge status={agent.status} />
                  </div>
                  
                  {agent.metadata && Object.keys(agent.metadata).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(agent.metadata).slice(0, 3).map(([key, value]) => (
                        <span 
                          key={key} 
                          className="inline-flex items-center px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[9px] text-stone-600 font-mono"
                          title={`${key}: ${JSON.stringify(value)}`}
                        >
                          {key}: {typeof value === 'object' ? '...' : String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {typeof agent.error === 'string' && agent.error.length > 0 && (
                    <div className="mt-2 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                      Error: {agent.error}
                    </div>
                  )}
                </div>
                
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-mono text-stone-500">
                    {formatDuration(agent.startTime, agent.endTime)}
                  </div>
                  <div className="text-[9px] text-stone-400">
                    {formatTime(agent.startTime)}
                  </div>
                </div>
              </div>
              
              {index < trace.agents.length - 1 && (
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300 rotate-0" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {trace.agents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-60">
            <Clock className="w-8 h-8 mb-2" />
            <span className="text-xs">No agents executed yet...</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/50 bg-white/30">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-50/50 border border-green-100">
            <div className="text-lg font-bold text-green-600">{completedCount}</div>
            <div className="text-[9px] text-stone-500 uppercase tracking-wide">Completed</div>
          </div>
          <div className="p-2 rounded-lg bg-red-50/50 border border-red-100">
            <div className="text-lg font-bold text-red-600">{failedCount}</div>
            <div className="text-[9px] text-stone-500 uppercase tracking-wide">Failed</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-50/50 border border-yellow-100">
            <div className="text-lg font-bold text-yellow-600">{skippedCount}</div>
            <div className="text-[9px] text-stone-500 uppercase tracking-wide">Skipped</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="text-lg font-bold text-blue-600">{runningCount}</div>
            <div className="text-[9px] text-stone-500 uppercase tracking-wide">Running</div>
          </div>
        </div>
      </div>
    </div>
  );
});

AgentFlow.displayName = 'AgentFlow';

// Helper Functions
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function formatDuration(start: number, end?: number): string {
  const duration = (end ?? Date.now()) - start;
  if (duration < 1000) return `${duration.toString()}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${Math.floor(duration / 60000).toString()}m ${Math.floor((duration % 60000) / 1000).toString()}s`;
}

// Status Components
interface StatusIconProps {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  className?: string;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, className }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`${className ?? ''} text-green-600`} />;
    case 'failed':
      return <XCircle className={`${className ?? ''} text-red-600`} />;
    case 'running':
      return <Loader2 className={`${className ?? ''} text-blue-600 animate-spin`} />;
    case 'skipped':
      return <Ban className={`${className ?? ''} text-yellow-600`} />;
    default:
      return <Clock className={`${className ?? ''} text-stone-400`} />;
  }
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    running: 'bg-blue-100 text-blue-700 border-blue-200',
    skipped: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    pending: 'bg-stone-100 text-stone-600 border-stone-200'
  };
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${colors[status] ?? colors.pending}`}>
      {status.toUpperCase()}
    </span>
  );
};

export default AgentFlow;
