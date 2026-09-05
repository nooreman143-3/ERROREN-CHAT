import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import { safeStorage } from '../../utils/safeStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Frontend Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleClearAndReload = () => {
    try {
      safeStorage.clearAll();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected client error occurred.';
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            {/* Logo and Status Badge */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-inner">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  ERROREN CHAT
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Something went wrong.
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-md">
                The application encountered an unexpected issue. Don't worry, your chats and session are safe.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="mb-6 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Error Details
              </div>
              <div className="text-xs font-mono text-red-300 break-words line-clamp-3">
                {errorMessage}
              </div>
              {componentStack && (
                <div className="mt-2 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-dotted"
                  >
                    {this.state.showDetails ? 'Hide Stack Trace' : 'View Stack Trace'}
                  </button>
                  {this.state.showDetails && (
                    <pre className="mt-2 max-h-40 overflow-y-auto text-[10px] text-slate-400 font-mono whitespace-pre-wrap bg-black/40 p-2 rounded">
                      {componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
            </div>

            {/* Recovery Option */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
                title="Clears corrupted client storage if a bad local state caused the error"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Local Cache & Reset Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
