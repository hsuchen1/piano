import React from 'react';
import type { ToastTone } from './dialogContext';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'bg-gray-700 border-blue-500 text-gray-100',
  success: 'bg-gray-700 border-green-500 text-gray-100',
  error: 'bg-gray-700 border-red-500 text-red-100',
};

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * Replaces the informational alert() calls.
 *
 * The live region is always mounted, even when empty: screen readers only announce
 * changes to a region that already exists, so creating it at the same moment the
 * message appears would swallow the announcement. Errors use role="alert" so they
 * interrupt, while confirmations use role="status" so they wait their turn.
 */
const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => (
  <div
    // Offset above the floating transport bar so toasts are never hidden behind it.
    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
    aria-live="polite"
    aria-atomic="false"
  >
    {toasts.map(toast => (
      <div
        key={toast.id}
        role={toast.tone === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto w-full flex items-start gap-3 rounded-md border-l-4 px-4 py-3 shadow-lg ${TONE_STYLES[toast.tone]}`}
      >
        <p className="text-sm flex-grow">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          aria-label="關閉通知"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ))}
  </div>
);

export default ToastStack;
