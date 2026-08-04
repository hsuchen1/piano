import React, { useCallback, useEffect, useRef } from 'react';

interface ModalProps {
  /** Announced as the dialog's accessible name. */
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Escape and backdrop clicks route here, so it should be the cancelling path. */
  onDismiss: () => void;
  /** `lg` is for long-form content such as the tutorial. */
  size?: 'md' | 'lg';
  /**
   * Caps the body height and scrolls it, keeping the title and footer in place.
   * Needed for content taller than the viewport.
   */
  scrollBody?: boolean;
}

const SIZE_CLASS: Record<'md' | 'lg', string> = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
};

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
const Modal: React.FC<ModalProps> = ({
  title,
  children,
  footer,
  onDismiss,
  size = 'md',
  scrollBody = false,
}) => {
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
        className={`bg-surface-1 border border-surface-line rounded-lg shadow-2xl p-6 w-full flex flex-col max-h-[90vh] ${SIZE_CLASS[size]}`}
        onClick={event => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-gray-100 shrink-0">
          {title}
        </h2>

        <div
          className={
            scrollBody
              ? 'flex-grow overflow-y-auto my-4 space-y-4 pr-1 scrollbar-thin [--sb-track:theme(colors.surface.1)]'
              : 'my-4 space-y-4'
          }
        >
          {children}
        </div>

        <div className="flex justify-end gap-3 shrink-0">{footer}</div>
      </div>
    </div>
  );
};

export default Modal;
