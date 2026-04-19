'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-center">
          <p className="text-red-400 text-sm">
            ⚠️ Errore nel componente {this.props.name || 'sconosciuto'}
          </p>
          <p className="text-red-300/60 text-xs mt-1">
            {this.state.error?.message}
          </p>
          <button
            className="mt-2 px-3 py-1 bg-red-800/50 hover:bg-red-700/50 text-red-300 text-xs rounded transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
