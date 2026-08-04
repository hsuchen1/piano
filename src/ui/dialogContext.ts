import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Defaults to 確定. */
  confirmLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
}

export interface PromptOptions {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
}

export interface DialogApi {
  /** Transient, non-blocking message. Replaces informational alert(). */
  showToast: (message: string, tone?: ToastTone) => void;
  /** Resolves true if confirmed, false if dismissed. Replaces window.confirm. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the trimmed text, or null if cancelled. Replaces window.prompt. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

export const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) {
    throw new Error('useDialogs must be used inside a DialogProvider.');
  }
  return api;
}
