import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#ef4444', background: '#0f1117', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>
            The application encountered an unexpected error. Try refreshing the page.
          </p>
          <pre style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16, padding: '8px 20px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
