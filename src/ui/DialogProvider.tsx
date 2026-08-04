import React, { useCallback, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import ToastStack, { type ToastItem } from './Toast';
import {
  DialogContext,
  type ConfirmOptions,
  type DialogApi,
  type PromptOptions,
  type ToastTone,
} from './dialogContext';

const TOAST_DURATION_MS = 4000;

/** Only one confirm or prompt can be open at a time, so a single slot is enough. */
type PendingDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

/**
 * Provides in-app replacements for alert, confirm and prompt.
 *
 * The confirm and prompt APIs are promise-based on purpose: it keeps call sites
 * reading almost exactly like the native versions they replace
 * (`if (!await confirm(...)) return;`), so swapping them in did not require
 * restructuring the handlers.
 *
 * Native dialogs block the main thread, which for this app means they freeze audio
 * scheduling while open. They also cannot be styled, and on mobile browsers they
 * are visually jarring and sometimes suppressible by the user.
 */
const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, tone }]);

    timers.current.set(
      id,
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    );
  }, [dismissToast]);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => {
        setPending({ kind: 'confirm', options, resolve });
      }),
    []
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>(resolve => {
        setPromptValue(options.initialValue ?? '');
        setPending({ kind: 'prompt', options, resolve });
      }),
    []
  );

  /** Settles the open dialog exactly once and clears the slot. */
  const settle = useCallback((value: boolean | string | null) => {
    setPending(current => {
      if (!current) return null;
      if (current.kind === 'confirm') {
        current.resolve(value === true);
      } else {
        current.resolve(typeof value === 'string' ? value : null);
      }
      return null;
    });
  }, []);

  const api = useMemo<DialogApi>(
    () => ({ showToast, confirm, prompt }),
    [showToast, confirm, prompt]
  );

  const trimmedPrompt = promptValue.trim();

  return (
    <DialogContext.Provider value={api}>
      {children}

      {pending?.kind === 'confirm' && (
        <Modal
          title={pending.options.title}
          onDismiss={() => settle(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => settle(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`px-4 py-2 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 ${
                  pending.options.destructive
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400'
                }`}
              >
                {pending.options.confirmLabel ?? '確定'}
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-300">{pending.options.message}</p>
        </Modal>
      )}

      {pending?.kind === 'prompt' && (
        <Modal
          title={pending.options.title}
          onDismiss={() => settle(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => settle(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => settle(trimmedPrompt)}
                disabled={trimmedPrompt === ''}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                確定
              </button>
            </>
          }
        >
          {/* A form so Enter submits, matching what window.prompt did. */}
          <form
            onSubmit={event => {
              event.preventDefault();
              if (trimmedPrompt !== '') settle(trimmedPrompt);
            }}
          >
            <label htmlFor="dialog-prompt-input" className="block text-sm text-gray-300 mb-1">
              {pending.options.label}
            </label>
            <input
              id="dialog-prompt-input"
              type="text"
              value={promptValue}
              onChange={event => setPromptValue(event.target.value)}
              placeholder={pending.options.placeholder}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-500"
            />
          </form>
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </DialogContext.Provider>
  );
};

export default DialogProvider;
