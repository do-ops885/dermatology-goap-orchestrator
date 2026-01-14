import { Database, ShieldCheck, Stethoscope, Download, WifiOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { ThemeSwitcher } from './ThemeSwitcher';

interface HeaderProps {
  dbReady: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Header({ dbReady }: HeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // PWA Install Prompt Handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Offline Status Handler
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt === null) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // eslint-disable-next-line no-console
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope className="w-5 h-5 text-terracotta-600" />
          <span className="text-xs font-bold font-mono tracking-widest text-terracotta-600 uppercase">
            Medical AI v3.1
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-grotesk tracking-tight text-stone-900 mb-2">
          Clinical AI <br />
          <span className="text-terracotta-600">Orchestrator</span>
        </h1>
        <p className="text-stone-500 max-w-lg font-light leading-relaxed">
          Autonomous multi-agent system ensuring diagnostic equity and skin-tone invariant analysis.
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2 mb-2">
          {deferredPrompt !== null && (
            <button
              onClick={() => {
                void handleInstallClick();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-full text-xs font-bold hover:bg-stone-700 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}
          <ThemeSwitcher />
        </div>

        {isOffline ? (
          <div className="px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-2 border bg-stone-100 border-stone-300 text-stone-500">
            <WifiOff className="w-3 h-3" />
            OFFLINE MODE
          </div>
        ) : (
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-2 border ${dbReady ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
          >
            <Database className="w-3 h-3" />
            AUDIT LEDGER: {dbReady ? 'ACTIVE' : 'SYNCING...'}
          </div>
        )}

        <div className="px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-2 border bg-blue-50 border-blue-200 text-blue-800">
          <ShieldCheck className="w-3 h-3" />
          PATIENT DATA ENCRYPTED
        </div>
      </div>
    </header>
  );
}
