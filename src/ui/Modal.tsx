import React, { useCallback, useEffect, useRef } from 'react';

interface ModalProps {
  /** Announced as the dialog's accessible name. */
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Escape and backdrop clicks route here, so it should be the cancelling path. */
  onDismiss: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal shell used by the confirm and prompt dialogs.
 *
 * Native alert/confirm/prompt gave keyboard and screen reader behaviour for free.
 * Replacing them means taking that on deliberately, so this handles the parts a
 * plain styled <div> would miss: an accessible name, moving focus in on open,
 * keeping Tab inside the dialog, Escape to cancel, and returning focus to whatever
 * was focused before.
 */
const Modal: React.FC<ModalProps> = ({ title, children, footer, onDismiss }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first control so keyboard and screen reader users start inside the
    // dialog rather than behind it.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    return () => previouslyFocused?.focus();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onDismiss();
      return;
    }

    if (event.key !== 'Tab') return;

    // Without this, Tab walks out of the dialog into the page behind it.
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4"
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md space-y-4"
        onClick={event => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-gray-100">
          {title}
        </h2>
        {children}
        <div className="flex justify-end gap-3 pt-1">{footer}</div>
      </div>
    </div>
  );
};

export default Modal;
