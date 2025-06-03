
import * as Tone from 'tone';
import { NoteName, ChordType } from '../types';
import { CHORD_INTERVALS } from '../constants';
import { getNoteFullName } from '../constants'; // getNoteFullName remains in constants.ts

// Use the imported Tone directly
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
