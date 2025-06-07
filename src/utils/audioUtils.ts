
import * as Tone from 'tone';
import { NoteName, ChordType, ChordDefinition, BassPattern } from '../types';
import { CHORD_INTERVALS, BASS_DEFAULT_OCTAVE } from '../constants';
import { getNoteFullName } from '../constants';

const ToneRef = Tone;

export const getChordNotes = (root: NoteName, type: ChordType, octaveForRoot: number, transpose: number): string[] => {
  if (!ToneRef || !ToneRef.Frequency) {
    console.error("Tone.js or Tone.Frequency is not available in getChordNotes.");
    return [];
  }
  const intervals = CHORD_INTERVALS[type];
  const rootFullName = getNoteFullName(root, octaveForRoot, transpose);
  try {
    const rootMidi = ToneRef.Frequency(rootFullName).toMidi();
    return intervals.map(interval => {
      const midiValue = rootMidi + interval;
      return ToneRef.Frequency(midiValue, "midi").toNote();
    });
  } catch (error) {
    console.error(`Error calculating chord notes for ${root}${type} (root: ${rootFullName}):`, error);
    return [];
  }
};

interface BassNoteEvent {
  note: string;
  timeOffset: string; // e.g., "0:0:0", "0:1:0"
  duration: string; // e.g., "4n", "2n"
}

export const getBassNotesForPattern = (
  chord: ChordDefinition,
  pattern: BassPattern,
  baseOctave: number,
  transpose: number
): BassNoteEvent[] => {
  if (!ToneRef || !ToneRef.Frequency) return [];

  const rootNoteName = chord.root;
  const intervals = CHORD_INTERVALS[chord.type] || CHORD_INTERVALS[ChordType.Major]; // Fallback to major intervals

  const getTransposedNote = (note: NoteName, intervalOffset: number, octave: number): string => {
    const rootMidi = ToneRef.Frequency(getNoteFullName(note, octave, 0)).toMidi(); // Get MIDI without final transpose first
    const targetMidi = rootMidi + intervalOffset;
    const noteWithoutTranspose = ToneRef.Frequency(targetMidi, "midi").toNote();
    // Now apply overall transposition. Parse the note and octave, then use getNoteFullName.
    const parsedNoteMatch = noteWithoutTranspose.match(/([A-Ga-g]#?b?)(\d+)/);
    if (parsedNoteMatch) {
        return getNoteFullName(parsedNoteMatch[1] as NoteName, parseInt(parsedNoteMatch[2]), transpose);
    }
    return getNoteFullName(note, octave, transpose); // Fallback
  };
  
  const rootBassNote = getTransposedNote(rootNoteName, 0, baseOctave);
  const thirdBassNote = getTransposedNote(rootNoteName, intervals[1], baseOctave); // intervals[1] is the third
  const fifthBassNote = getTransposedNote(rootNoteName, intervals[2], baseOctave); // intervals[2] is the fifth
  // const octaveBassNote = getTransposedNote(rootNoteName, 12, baseOctave);
  const octaveBassNote = getNoteFullName(rootNoteName, baseOctave + 1, transpose);


  switch (pattern) {
    case BassPattern.Off:
      return [];
    case BassPattern.RootNotes:
      return [{ note: rootBassNote, timeOffset: "0:0:0", duration: "1m" }];
    case BassPattern.RootAndFifth:
      return [
        { note: rootBassNote, timeOffset: "0:0:0", duration: "2n" },
        { note: fifthBassNote, timeOffset: "0:2:0", duration: "2n" },
      ];
    case BassPattern.SimpleArpeggio: // Root-Third-Fifth-Octave
      return [
        { note: rootBassNote, timeOffset: "0:0:0", duration: "4n" },
        { note: thirdBassNote, timeOffset: "0:1:0", duration: "4n" },
        { note: fifthBassNote, timeOffset: "0:2:0", duration: "4n" },
        { note: octaveBassNote, timeOffset: "0:3:0", duration: "4n" },
      ];
    case BassPattern.WalkingBassSimple: // Simple 1-3-5-6 for major, 1-b3-5-b7 for others (simplified)
      const sixthInterval = chord.type === ChordType.Major || chord.type === ChordType.Major7th ? 9 : 10; // Major 6th or minor 7th as simplified "passing tone"
      const sixthBassNote = getTransposedNote(rootNoteName, sixthInterval, baseOctave);
      return [
        { note: rootBassNote, timeOffset: "0:0:0", duration: "4n" },
        { note: thirdBassNote, timeOffset: "0:1:0", duration: "4n" },
        { note: fifthBassNote, timeOffset: "0:2:0", duration: "4n" },
        { note: sixthBassNote, timeOffset: "0:3:0", duration: "4n" },
      ];
    default:
      return [{ note: rootBassNote, timeOffset: "0:0:0", duration: "1m" }];
  }
};
