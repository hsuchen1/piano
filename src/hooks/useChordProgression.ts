import { useCallback, useId, useMemo, useState } from 'react';
import {
  AccompanimentRhythmPattern,
  type AccompanimentLayer,
  type BeatDuration,
  type ChordDefinition,
  type CustomDrumChordPattern,
  type CustomDrumProgressionData,
  type DrumInstrument,
} from '../types';
import {
  createDefaultCustomDrumChordPattern,
  DEFAULT_ACCOMPANIMENT_LAYER,
  DEFAULT_CUSTOM_BEAT_DURATION,
  DRUM_INSTRUMENT_OPTIONS,
  NUM_BEATS_PER_DRUM_MEASURE,
  NUM_SUBDIVISIONS_PER_DRUM_BEAT,
} from '../constants';
import { createLayerId } from '../utils/ids';

export interface ChordWithIndex extends ChordDefinition {
  originalIndex: number;
}

interface DrumPatternClipboard {
  pattern: CustomDrumChordPattern;
  sourceIndex: number;
}

interface UseChordProgressionOptions {
  /**
   * Stops playback. Called when a structural edit leaves nothing sensible to
   * play, which keeps that invariant next to the edits that can break it rather
   * than scattered across the UI layer.
   *
   * No `isPlaying` flag is needed: stopping is idempotent, so it is simpler and
   * safer to always stop than to reason about whether we were playing. This also
   * avoids a dependency cycle, since useAudio needs the progression that this
   * hook owns.
   */
  stopPlayback: () => void;
  /** Called when the progression is replaced wholesale, so AI bass can be cleared. */
  onProgressionReplaced: () => void;
}

/**
 * Owns the progression document: the chords plus the two structures that must stay
 * aligned with it.
 *
 * `customDrumData` is indexed by chord position and `customRhythms` holds one grid
 * per accompaniment layer, each also indexed by chord position. Every add, remove
 * and reorder therefore has to touch all three in lockstep, and a missed update
 * silently shifts a chord's rhythm or drum pattern onto its neighbour. Keeping the
 * three together means those updates cannot drift apart.
 *
 * `accompanimentLayers` lives here too, because `customRhythms` is keyed by layer
 * id: removing a layer has to drop its grid, and switching a layer to the Custom
 * pattern has to create one sized to the current progression.
 */
export function useChordProgression({
  stopPlayback,
  onProgressionReplaced,
}: UseChordProgressionOptions) {
  const [progression, setProgression] = useState<ChordDefinition[]>([]);
  const [customRhythms, setCustomRhythms] = useState<Record<string, BeatDuration[][]>>({});
  const [customDrumData, setCustomDrumData] = useState<CustomDrumProgressionData>([]);
  const [drumPatternClipboard, setDrumPatternClipboard] =
    useState<DrumPatternClipboard | null>(null);

  // The first layer must exist on the very first render, so its id comes from
  // useId(). Calling Date.now() or Math.random() during render would produce an id
  // that changes whenever the component happens to re-render.
  const initialLayerId = useId();
  const [accompanimentLayers, setAccompanimentLayers] = useState<AccompanimentLayer[]>(
    () => [{ id: initialLayerId, ...DEFAULT_ACCOMPANIMENT_LAYER }]
  );

  /** Chords tagged with their position, which the sequencer needs for lookups. */
  const progressionWithIndices: ChordWithIndex[] = useMemo(
    () => progression.map((chord, index) => ({ ...chord, originalIndex: index })),
    [progression]
  );

  const emptyBeatRow = useCallback(
    () => Array<BeatDuration>(NUM_BEATS_PER_DRUM_MEASURE).fill(DEFAULT_CUSTOM_BEAT_DURATION),
    []
  );

  const addChord = useCallback((chord: ChordDefinition) => {
    setProgression(prev => [...prev, chord]);
    setCustomRhythms(prev => {
      const next = { ...prev };
      for (const layerId in next) {
        next[layerId] = [...next[layerId], emptyBeatRow()];
      }
      return next;
    });
    setCustomDrumData(prev => [...prev, createDefaultCustomDrumChordPattern()]);
  }, [emptyBeatRow]);

  const removeChord = useCallback((idToRemove: string) => {
    const indexToRemove = progression.findIndex(chord => chord.id === idToRemove);
    if (indexToRemove === -1) return;

    // Removing the last chord leaves nothing to play.
    if (progression.length === 1) stopPlayback();

    setProgression(prev => prev.filter(c => c.id !== idToRemove));
    setCustomRhythms(prev => {
      const next = { ...prev };
      for (const layerId in next) {
        next[layerId] = next[layerId].filter((_, i) => i !== indexToRemove);
      }
      return next;
    });
    setCustomDrumData(prev => prev.filter((_, i) => i !== indexToRemove));
  }, [progression, stopPlayback]);

  const clearProgression = useCallback(() => {
    stopPlayback();
    setProgression([]);
    setCustomRhythms({});
    setCustomDrumData([]);
    setDrumPatternClipboard(null);
    onProgressionReplaced();
  }, [stopPlayback, onProgressionReplaced]);

  const reorderProgression = useCallback((sourceIndex: number, destinationIndex: number) => {
    const move = <T,>(items: T[]): T[] => {
      const next = Array.from(items);
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(destinationIndex, 0, moved);
      return next;
    };

    setProgression(move);
    setCustomDrumData(move);
    setCustomRhythms(prev => {
      const next = { ...prev };
      for (const layerId in next) {
        next[layerId] = move(next[layerId]);
      }
      return next;
    });
  }, []);

  const updateChordInversion = useCallback((idToUpdate: string, inversion: number) => {
    setProgression(prev =>
      prev.map(chord => (chord.id === idToUpdate ? { ...chord, inversion } : chord))
    );
  }, []);

  /** Replaces the whole progression, as AI generation and loading a save both do. */
  const replaceProgression = useCallback((next: ChordDefinition[]) => {
    stopPlayback();
    setProgression(next);
    setCustomRhythms({});
    setCustomDrumData(next.map(() => createDefaultCustomDrumChordPattern()));
    setDrumPatternClipboard(null);
    onProgressionReplaced();
  }, [stopPlayback, onProgressionReplaced]);

  /** Restores a saved document, where the sidecar structures come from storage. */
  const restoreProgression = useCallback((restored: {
    progression: ChordDefinition[];
    accompanimentLayers: AccompanimentLayer[];
    customRhythms?: Record<string, BeatDuration[][]>;
    customDrumData?: CustomDrumProgressionData;
  }) => {
    stopPlayback();
    setProgression(restored.progression);
    setAccompanimentLayers(restored.accompanimentLayers);
    setCustomRhythms(restored.customRhythms ?? {});
    setCustomDrumData(restored.customDrumData ?? []);
    setDrumPatternClipboard(null);
  }, [stopPlayback]);

  const updateCustomRhythmBeat = useCallback((
    layerId: string,
    chordIndex: number,
    beatIndex: number,
    newDuration: BeatDuration
  ) => {
    setCustomRhythms(prev => {
      const layerRhythm = prev[layerId];
      if (!layerRhythm) return prev;

      return {
        ...prev,
        [layerId]: layerRhythm.map((chordBeats, i) => {
          if (i !== chordIndex) return chordBeats;
          const next = [...chordBeats];
          next[beatIndex] = newDuration;
          return next;
        }),
      };
    });
  }, []);

  const updateCustomDrumCell = useCallback((
    chordIndex: number,
    instrument: DrumInstrument,
    beatIndex: number,
    subdivisionIndex: number,
    isActive: boolean
  ) => {
    setCustomDrumData(prev => {
      const next = [...prev];
      const chordPattern = { ...(next[chordIndex] ?? createDefaultCustomDrumChordPattern()) };

      const grid = (chordPattern[instrument] ??
        Array.from({ length: NUM_BEATS_PER_DRUM_MEASURE }, () =>
          Array<boolean>(NUM_SUBDIVISIONS_PER_DRUM_BEAT).fill(false)
        )).map(beat => [...beat]);

      grid[beatIndex][subdivisionIndex] = isActive;
      chordPattern[instrument] = grid;
      next[chordIndex] = chordPattern;
      return next;
    });
  }, []);

  /** Keeps only recognised instruments, so an AI response cannot inject new keys. */
  const setCustomDrumPatternForChord = useCallback((
    chordIndex: number,
    newPattern: CustomDrumChordPattern
  ) => {
    setCustomDrumData(prev => {
      const next = [...prev];
      const validated = createDefaultCustomDrumChordPattern();

      for (const { value } of DRUM_INSTRUMENT_OPTIONS) {
        const grid = newPattern[value];
        if (grid) validated[value] = grid;
      }

      next[chordIndex] = validated;
      return next;
    });
  }, []);

  const copyDrumPattern = useCallback((chordIndex: number) => {
    setDrumPatternClipboard(prev => {
      // Clicking the already-copied chord again clears the clipboard.
      if (prev?.sourceIndex === chordIndex) return null;
      const pattern = customDrumData[chordIndex];
      return pattern ? { pattern, sourceIndex: chordIndex } : null;
    });
  }, [customDrumData]);

  const pasteDrumPattern = useCallback((chordIndex: number) => {
    if (drumPatternClipboard) {
      setCustomDrumPatternForChord(chordIndex, drumPatternClipboard.pattern);
    }
  }, [drumPatternClipboard, setCustomDrumPatternForChord]);

  const addAccompanimentLayer = useCallback(() => {
    setAccompanimentLayers(prev => [
      ...prev,
      { id: createLayerId(), ...DEFAULT_ACCOMPANIMENT_LAYER },
    ]);
  }, []);

  const removeAccompanimentLayer = useCallback((idToRemove: string) => {
    setAccompanimentLayers(prev => prev.filter(layer => layer.id !== idToRemove));
    // Drop the layer's rhythm grid too, or it would leak for the rest of the session
    // and be written into the next save.
    setCustomRhythms(prev => {
      if (!prev[idToRemove]) return prev;
      const next = { ...prev };
      delete next[idToRemove];
      return next;
    });
  }, []);

  const updateAccompanimentLayer = useCallback(<K extends keyof AccompanimentLayer>(
    idToUpdate: string,
    field: K,
    value: AccompanimentLayer[K]
  ) => {
    setAccompanimentLayers(prev =>
      prev.map(layer => (layer.id === idToUpdate ? { ...layer, [field]: value } : layer))
    );

    if (field !== 'rhythmPattern') return;

    if (value === AccompanimentRhythmPattern.Custom) {
      // Switching to Custom needs a grid sized to the current progression.
      setCustomRhythms(prev =>
        prev[idToUpdate]
          ? prev
          : { ...prev, [idToUpdate]: progression.map(() => emptyBeatRow()) }
      );
    } else {
      setCustomRhythms(prev => {
        if (!prev[idToUpdate]) return prev;
        const next = { ...prev };
        delete next[idToUpdate];
        return next;
      });
    }
  }, [progression, emptyBeatRow]);

  return {
    progression,
    progressionWithIndices,
    customRhythms,
    customDrumData,
    accompanimentLayers,
    drumPatternClipboard,

    addChord,
    removeChord,
    clearProgression,
    reorderProgression,
    updateChordInversion,
    replaceProgression,
    restoreProgression,

    updateCustomRhythmBeat,
    updateCustomDrumCell,
    setCustomDrumPatternForChord,
    copyDrumPattern,
    pasteDrumPattern,

    addAccompanimentLayer,
    removeAccompanimentLayer,
    updateAccompanimentLayer,
  };
}
