import React from 'react';
import { Database, ShieldCheck, Stethoscope } from 'lucide-react';

interface HeaderProps {
  dbReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ dbReady }) => {
  return (
    <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
           <Stethoscope className="w-5 h-5 text-terracotta-600" />
           <span className="text-xs font-bold font-mono tracking-widest text-terracotta-600 uppercase">Medical AI v3.0</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-grotesk tracking-tight text-stone-900 mb-2">
          Clinical AI <br/>
          <span className="text-terracotta-600">Orchestrator</span>
        </h1>
        <p className="text-stone-500 max-w-lg font-light leading-relaxed">
          Autonomous multi-agent system ensuring diagnostic equity and skin-tone invariant analysis.
        </p>
      </div>
      
      <div className="flex flex-col items-end gap-2">
         <div className={`px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-2 border ${dbReady ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <Database className="w-3 h-3" />
            AUDIT LEDGER: {dbReady ? 'ACTIVE' : 'SYNCING...'}
         </div>
         <div className="px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-2 border bg-blue-50 border-blue-200 text-blue-800">
            <ShieldCheck className="w-3 h-3" />
            PATIENT DATA ENCRYPTED
         </div>
      </div>
    </header>
  );
};