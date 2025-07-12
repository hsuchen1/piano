
import React from 'react';
import { useState } from 'react';
import { NoteName, ChordType, ChordDefinition } from '../types';
import { ACTIVE_NOTE_NAMES } from '../constants';

interface ChordSelectorProps {
  onAddChord: (chord: ChordDefinition) => void;
}

const CHORD_TYPE_DISPLAY_NAMES: Record<ChordType, string> = {
  [ChordType.Major]: "Major",
  [ChordType.Minor]: "Minor",
  [ChordType.Dominant7th]: "Dominant 7th",
  [ChordType.Minor7th]: "Minor 7th",
  [ChordType.Major7th]: "Major 7th",
  [ChordType.Diminished7th]: "Diminished 7th",
  [ChordType.Minor7thFlat5]: "Minor 7th b5 (ø)",
  [ChordType.Suspended2]: "Suspended 2nd",
  [ChordType.Suspended4]: "Suspended 4th",
  [ChordType.Major9]: "Major 9th",
  [ChordType.Minor9]: "Minor 9th",
  [ChordType.Dominant9]: "Dominant 9th",
  [ChordType.Major6]: "Major 6th",
  [ChordType.Minor6]: "Minor 6th",
  [ChordType.Augmented]: "Augmented",
  [ChordType.PowerChord]: "Power Chord (5)",
  [ChordType.Dominant7sharp9]: "Dominant 7th #9",
  [ChordType.Dominant7flat9]: "Dominant 7th b9",
};


const ChordSelector: React.FC<ChordSelectorProps> = ({ onAddChord }) => {
  const [rootNote, setRootNote] = useState<NoteName>("C");
  const [chordType, setChordType] = useState<ChordType>(ChordType.Major);

  const handleAddChord = () => {
    onAddChord({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      root: rootNote,
      type: chordType,
      inversion: 0, // Default to root position
    });
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">新增和弦至進行</h3>
      <div>
        <label htmlFor="rootNote" className="block text-sm font-medium text-gray-300 mb-1">根音</label>
        <select
          id="rootNote"
          value={rootNote}
          onChange={(e) => setRootNote(e.target.value as NoteName)}
          className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          {ACTIVE_NOTE_NAMES.map(note => (
            <option key={note} value={note}>{note}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="chordType" className="block text-sm font-medium text-gray-300 mb-1">和弦類型</label>
        <select
          id="chordType"
          value={chordType}
          onChange={(e) => setChordType(e.target.value as ChordType)}
          className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          {Object.values(ChordType).map(value => (
            <option key={value} value={value}>
              {CHORD_TYPE_DISPLAY_NAMES[value]} ({value})
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleAddChord}
        className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
      >
        新增和弦
      </button>
    </div>
  );
};

export default ChordSelector;