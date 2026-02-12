import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            fontFamily: 'system-ui, sans-serif',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <div>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem' }}>
              Something went wrong
            </p>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Open the browser console (F12) for details.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
