import React, { useState } from 'react';
import Modal from './Modal';

interface AiPromptDialogProps {
  title: string;
  /** Explains what the AI will do with the prompt. */
  description: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}

/**
 * The prompt dialog shared by every AI feature that takes a free-text description.
 *
 * Style transfer, AI bassline and AI drum pattern each had their own copy of this:
 * the same backdrop, panel, heading, description, three-row textarea and
 * cancel/submit pair, written out three times in three different accent colours.
 * None of them handled Escape, trapped focus, or restored focus on close, because
 * that behaviour lived only in ui/Modal.
 *
 * Prompt text is deliberately local state on a component that is unmounted when
 * closed, so each invocation starts empty without any explicit reset.
 */
const AiPromptDialog: React.FC<AiPromptDialogProps> = ({
  title,
  description,
  placeholder,
  submitLabel = '生成',
  onSubmit,
  onCancel,
}) => {
  const [prompt, setPrompt] = useState('');
  const trimmed = prompt.trim();

  const submit = () => {
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Modal
      title={title}
      onDismiss={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 min-h-tap inline-flex items-center bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={trimmed === ''}
            className="px-4 min-h-tap inline-flex items-center bg-accent-ai hover:bg-purple-700 text-white font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ai disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-400">{description}</p>

      <textarea
        rows={3}
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        // Enter submits, matching the dialogs in DialogProvider. Shift+Enter still
        // inserts a newline, since these prompts can be a sentence or two.
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        className="w-full p-2.5 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-accent-ai focus:border-accent-ai transition-colors placeholder-gray-500"
        placeholder={placeholder}
        aria-label={title}
      />
    </Modal>
  );
};

export default AiPromptDialog;
