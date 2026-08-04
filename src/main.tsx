import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Nothing to mount into, so React cannot help us report this. Keep the raw DOM
  // fallback, but build it with the DOM API rather than innerHTML.
  const fallback = document.createElement('div');
  fallback.setAttribute('role', 'alert');
  fallback.style.cssText =
    'color:#f3f4f6;background-color:#1f2937;padding:20px;font-family:sans-serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;';

  const heading = document.createElement('h1');
  heading.textContent = '應用程式啟動錯誤';
  const detail = document.createElement('p');
  detail.textContent = '找不到用於掛載應用程式的根元素，請檢查 index.html 的結構。';

  fallback.append(heading, detail);
  document.body.append(fallback);

  throw new Error('Could not find #root element to mount to');
}

// Render-phase failures are handled by ErrorBoundary, which sits inside the root
// so that React can recover the subtree instead of losing the whole page.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
