
import * as Tone from 'tone';
import { NoteName, ChordType, ChordDefinition, BassPattern } from '../types';
import { CHORD_INTERVALS, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT } from '../constants';
import { getNoteFullName } from '../constants';

const ToneRef = Tone;

export const getChordNotes = (chord: ChordDefinition, octaveForRoot: number, transpose: number): string[] => {
  if (!ToneRef || !ToneRef.Frequency) {
    console.error("Tone.js or Tone.Frequency is not available in getChordNotes.");
    return [];
  }
  const { root, type, inversion } = chord;
  const intervals = CHORD_INTERVALS[type];
  if (!intervals) {
      console.error(`No intervals found for chord type: ${type}`);
      return [];
  }
  const rootFullName = getNoteFullName(root, octaveForRoot, transpose);

  try {
    const rootMidi = ToneRef.Frequency(rootFullName).toMidi();
    let midiValues = intervals.map(interval => rootMidi + interval);

    // Apply inversions
    if (inversion > 0 && midiValues.length > 1) {
      const notesToShift = inversion % midiValues.length;
      for (let i = 0; i < notesToShift; i++) {
        if (midiValues.length > 1) {
            const firstVal = midiValues.shift();
            if(firstVal !== undefined) {
                midiValues.push(firstVal + 12); // move up an octave
            }
        }
      }
    }

    return midiValues.map(midi => ToneRef.Frequency(midi, "midi").toNote());
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

  const invertedChordNotes = getChordNotes(chord, baseOctave, transpose);
  if (invertedChordNotes.length === 0) return [];
  
  const bassNote = invertedChordNotes[0]; // The root of the (possibly inverted) chord
  const thirdNote = invertedChordNotes[1] || bassNote;
  const fifthNote = invertedChordNotes[2] || bassNote;

  // For arpeggios and other patterns
  let octaveNote: string;
  let secondNote: string; // Major second above the bass note
  try {
      const bassNoteMidi = ToneRef.Frequency(bassNote).toMidi();
      octaveNote = ToneRef.Frequency(bassNoteMidi + 12, "midi").toNote();
      secondNote = ToneRef.Frequency(bassNoteMidi + 2, "midi").toNote();
  } catch (e) {
      octaveNote = bassNote; // Fallback
      secondNote = thirdNote; // Fallback to the third if something goes wrong
  }


  switch (pattern) {
    case BassPattern.Off:
      return [];
    case BassPattern.RootNotes:
      return [{ note: bassNote, timeOffset: "0:0:0", duration: "1m" }];
    case BassPattern.RootAndFifth:
      return [
        { note: bassNote, timeOffset: "0:0:0", duration: "2n" },
        { note: fifthNote, timeOffset: "0:2:0", duration: "2n" },
      ];
    case BassPattern.SimpleArpeggio: // Root-Third-Fifth-Octave of the inverted chord
      return [
        { note: bassNote, timeOffset: "0:0:0", duration: "4n" },
        { note: thirdNote, timeOffset: "0:1:0", duration: "4n" },
        { note: fifthNote, timeOffset: "0:2:0", duration: "4n" },
        { note: octaveNote, timeOffset: "0:3:0", duration: "4n" },
      ];
    case BassPattern.WalkingBassSimple:
      // New pattern: Root - Root - 5th - 3rd. More rhythmic and distinct.
      return [
        { note: bassNote, timeOffset: "0:0:0", duration: "4n" },
        { note: bassNote, timeOffset: "0:1:0", duration: "4n" },
        { note: fifthNote, timeOffset: "0:2:0", duration: "4n" },
        { note: thirdNote, timeOffset: "0:3:0", duration: "4n" },
      ];
    case BassPattern.WalkingBassMelodic:
      return [
        { note: bassNote, timeOffset: "0:0:0", duration: "4n" },
        { note: secondNote, timeOffset: "0:1:0", duration: "4n" },
        { note: thirdNote, timeOffset: "0:2:0", duration: "4n" },
        { note: fifthNote, timeOffset: "0:3:0", duration: "4n" },
      ];
    case BassPattern.FunkSlap:
      return [
        { note: bassNote, timeOffset: "0:0:0", duration: "16n" },
        { note: bassNote, timeOffset: "0:1:0", duration: "16n" },
        { note: octaveNote, timeOffset: "0:1:3", duration: "16n" },
        { note: bassNote, timeOffset: "0:2:0", duration: "16n" },
        { note: fifthNote, timeOffset: "0:3:0", duration: "16n" },
        { note: octaveNote, timeOffset: "0:3:3", duration: "16n" },
      ];
    default:
      return [{ note: bassNote, timeOffset: "0:0:0", duration: "1m" }];
  }
};

export const getVoicingOptionsForChord = (chord: ChordDefinition, baseOctave: number): { inversion: number; notes: string[] }[] => {
  const options: { inversion: number; notes: string[] }[] = [];
  const intervals = CHORD_INTERVALS[chord.type];
  if (!intervals || !ToneRef) {
    return [];
  }

  const maxInversions = intervals.length;

  for (let i = 0; i < maxInversions; i++) {
    const tempChordDef: ChordDefinition = { ...chord, inversion: i };
    // We call getChordNotes without transposition for this specific calculation
    const notes = getChordNotes(tempChordDef, baseOctave, 0); 
    if (notes.length > 0) {
      options.push({ inversion: i, notes: notes });
    }
  }
  return options;
};

/**
 * Checks if a string is a valid ChordType.
 * @param type The string to validate.
 * @returns True if the string is a valid ChordType, false otherwise.
 */
export const isChordType = (type: string): type is ChordType => {
  return Object.values(ChordType).includes(type as ChordType);
};

/**
 * Normalizes a note name to its sharp equivalent if it's a flat.
 * @param note The note name (e.g., "Db", "C#", "G").
 * @returns The normalized NoteName or null if invalid.
 */
export const normalizeNoteName = (note: string): NoteName | null => {
    // Sanitize input to handle potential whitespace and capitalization issues
  const sanitizedNote = note.trim();
  const upperNote = sanitizedNote.charAt(0).toUpperCase() + sanitizedNote.slice(1);
  
  // Direct match for sharp/natural notes
  const sharpIndex = NOTE_NAMES_SHARP.indexOf(upperNote as NoteName);
  if (sharpIndex > -1) {
    return NOTE_NAMES_SHARP[sharpIndex];
  }

  // Match for flat notes and convert to sharp equivalent
  const flatIndex = NOTE_NAMES_FLAT.indexOf(upperNote);
  if (flatIndex > -1) {
    return NOTE_NAMES_SHARP[flatIndex]; // Return the sharp equivalent from the same index
  }
  
  console.warn(`[normalizeNoteName] Invalid note name received: "${note}"`);
  return null;
};
