import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-phase and lifecycle errors anywhere below it and shows a
 * recoverable fallback instead of an empty page.
 *
 * This cannot be done with a hook: React only exposes error catching through the
 * class lifecycle (getDerivedStateFromError / componentDidCatch). A try/catch
 * around ReactDOM.render() does NOT work, because rendering in React 18+ is
 * asynchronous and interruptible, so the throw escapes the synchronous call.
 *
 * Note that error boundaries deliberately do not catch errors thrown inside
 * event handlers or async callbacks -- those are handled locally by the feature
 * that owns them (see useGeminiClient's error state).
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-gray-800 text-gray-100 flex items-center justify-center p-4"
      >
        <div className="max-w-2xl w-full bg-gray-700 rounded-lg shadow-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-red-400">應用程式發生錯誤</h1>
          <p className="text-gray-300">
            很抱歉，剛才的操作讓程式進入異常狀態。您已儲存的和弦進行不會受到影響。
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-700"
            >
              嘗試復原
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-700"
            >
              重新載入頁面
            </button>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
              技術細節（回報問題時請附上）
            </summary>
            {/* Rendered as text, not innerHTML, so a malformed message cannot inject markup. */}
            <pre className="mt-2 p-3 bg-gray-800 rounded text-red-300 text-xs whitespace-pre-wrap break-words overflow-auto max-h-64">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
