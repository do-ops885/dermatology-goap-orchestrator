import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { type Component, type ErrorInfo, type ReactNode } from 'react';

import { Logger } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error(this.props.componentName ?? 'ErrorBoundary', 'Component Crashed', {
      error: error.message,
      stack: errorInfo.componentStack ?? ''
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;

      return (
        <div className="p-6 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center h-full min-h-[200px]">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-sm font-bold text-red-800 font-grotesk mb-1">
            {this.props.componentName ?? 'System'} Module Failed
          </h3>
          <p className="text-xs text-red-600 mb-4 max-w-xs leading-relaxed">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button 
            onClick={this.handleReset}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            Restart Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}