import { useCallback, useRef, useState } from 'react';
import type { GenerationKind, GenerationState } from '../types';

interface RunOptions {
  /** Which feature is running, so only its button shows a spinner. */
  kind: GenerationKind;
  /** Prefix for the user-facing error, e.g. "AI 貝斯線生成失敗". */
  errorLabel: string;
  /** Passed through to GenerationState so the drum grid can spin one cell. */
  drumChordIndex?: number;
}

export interface UseAiGenerationReturn {
  generationState: GenerationState;
  /**
   * Runs an AI request with loading and error bookkeeping applied consistently.
   * Resolves to the task's value, or undefined if it failed or was skipped
   * because another request is already in flight.
   */
  run: <T>(options: RunOptions, task: () => Promise<T>) => Promise<T | undefined>;
  /** Reports a problem without running a request, e.g. a missing API key. */
  reportError: (kind: GenerationKind, message: string) => void;
  clearError: () => void;
}

/**
 * Owns the progress state shared by the five AI features.
 *
 * Each handler in App.tsx used to repeat the same four steps by hand: bail out if
 * a request is in flight, flip isLoading on, and on both success and failure
 * write the state back, formatting `error instanceof Error ? error.message : ...`
 * inline. The bookkeeping had already drifted -- the chord generator reported a
 * missing API key through generationState while the other four used alert().
 */
export function useAiGeneration(): UseAiGenerationReturn {
  const [generationState, setGenerationState] = useState<GenerationState>({
    type: null,
    isLoading: false,
    error: null,
  });

  // The in-flight guard has to be a ref, not the isLoading state. React batches
  // state updates, so a setState updater does not run synchronously and cannot be
  // used to detect concurrent calls. A ref also lets `run` keep a stable identity,
  // so callers never need it in a dependency array.
  const isRunning = useRef(false);

  const run = useCallback(
    async <T,>(
      { kind, errorLabel, drumChordIndex }: RunOptions,
      task: () => Promise<T>
    ): Promise<T | undefined> => {
      if (isRunning.current) return undefined;
      isRunning.current = true;
      setGenerationState({ type: kind, isLoading: true, error: null, drumChordIndex });

      try {
        const result = await task();
        setGenerationState({ type: null, isLoading: false, error: null });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : '發生未知的錯誤。';
        console.error(`[useAiGeneration] ${kind} failed:`, error);
        setGenerationState({
          type: kind,
          isLoading: false,
          error: `${errorLabel}: ${message}`,
          drumChordIndex,
        });
        return undefined;
      } finally {
        isRunning.current = false;
      }
    },
    []
  );

  const reportError = useCallback((kind: GenerationKind, message: string) => {
    setGenerationState({ type: kind, isLoading: false, error: message });
  }, []);

  const clearError = useCallback(() => {
    setGenerationState({ type: null, isLoading: false, error: null });
  }, []);

  return { generationState, run, reportError, clearError };
}
