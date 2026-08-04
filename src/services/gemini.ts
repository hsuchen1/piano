import {
  ChordType,
  type AiNoteEvent,
  type ChordDefinition,
  type CustomDrumChordPattern,
  type DrumInstrument,
} from '../types';
import { CHORD_INTERVALS, DRUM_INSTRUMENT_OPTIONS } from '../constants';
import { createChordId } from '../utils/ids';
import { isChordType, normalizeNoteName } from '../utils/audioUtils';

/**
 * All Gemini access goes through here.
 *
 * App.tsx previously carried five near-identical blocks that each constructed a
 * client, repeated the model name and `responseMimeType`, inlined a response
 * schema (the chord schema was duplicated verbatim twice), parsed the JSON and
 * then hand-rolled the same error-message formatting. Response validation lived
 * in the middle of React state updates, so none of it could be tested.
 */

export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Gemini's `response.text` is optional: it is `undefined` when the model returns
 * no usable candidate (safety block, empty completion, quota trip). Passing that
 * straight to JSON.parse throws an opaque `"undefined" is not valid JSON`, which
 * surfaces to the user as gibberish. Distinguish "no response" from "malformed
 * response" so the error message is actionable.
 */
export function parseAiJson<T>(text: string | undefined): T {
  if (!text || !text.trim()) {
    throw new Error('AI 未回傳任何內容（可能被安全機制阻擋或額度已用盡），請稍後再試或調整提示詞。');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('AI 回傳的內容不是有效的 JSON 格式，請重試。');
  }
}

type GenAiModule = typeof import('@google/genai');
type GenAiClient = InstanceType<GenAiModule['GoogleGenAI']>;
/** The response-schema type enum, supplied to schema builders. */
type SchemaTypes = GenAiModule['Type'];

/**
 * The SDK is loaded on demand rather than imported at the top of the file.
 *
 * It is one of the two largest dependencies in the bundle, and the AI features are
 * entirely optional: a user who only plays the keyboard never needs it. A static
 * import forced everyone to download it before the app could start.
 *
 * The promise is cached, so concurrent callers share one network request and the
 * module is only evaluated once.
 */
let modulePromise: Promise<GenAiModule> | null = null;

function loadGenAi(): Promise<GenAiModule> {
  modulePromise ??= import('@google/genai');
  return modulePromise;
}

// A client was constructed on every single request. Cache per key instead, and
// rebuild only when the user changes their key.
let cachedClient: { apiKey: string; client: GenAiClient } | null = null;

async function getClient(apiKey: string): Promise<GenAiClient> {
  if (cachedClient?.apiKey !== apiKey) {
    const { GoogleGenAI } = await loadGenAi();
    cachedClient = { apiKey, client: new GoogleGenAI({ apiKey }) };
  }
  return cachedClient.client;
}

/** Exported for tests, which must not reuse a client across cases. */
export function resetGeminiClientCache(): void {
  cachedClient = null;
}

interface JsonRequest {
  apiKey: string;
  contents: string;
  systemInstruction: string;
  /**
   * Built lazily because the `Type` enum it needs comes from the dynamically
   * imported SDK, so it cannot be referenced at module scope any more.
   */
  buildSchema: (Type: SchemaTypes) => Record<string, unknown>;
}

/** The single place that performs a structured-JSON request. */
async function requestJson<T>({
  apiKey,
  contents,
  systemInstruction,
  buildSchema,
}: JsonRequest): Promise<T> {
  const [client, { Type }] = await Promise.all([getClient(apiKey), loadGenAi()]);

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: buildSchema(Type),
    },
  });

  return parseAiJson<T>(response.text);
}

/** Shared by chord generation and re-harmonisation, which had identical copies. */
const buildChordArraySchema = (Type: SchemaTypes): Record<string, unknown> => ({
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      root: { type: Type.STRING, description: "The chord's root note, e.g., 'C', 'G#', 'Bb'" },
      type: {
        type: Type.STRING,
        description: `The chord type, must be one of: '${Object.values(ChordType).join("', '")}'`,
      },
    },
    required: ['root', 'type'],
  },
});

/**
 * Turns the model's untyped chord list into domain objects, rejecting anything
 * that is not a real note name or chord type. Flats are normalised to sharps.
 *
 * Exported because this is the part most worth testing: it is the boundary
 * between an unpredictable model and the rest of the app.
 */
export function validateChordSuggestions(raw: unknown): ChordDefinition[] {
  if (!Array.isArray(raw)) {
    throw new Error('AI 回傳的和弦資料不是陣列。');
  }

  return raw.map(item => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('AI 回傳的和弦項目格式不正確。');
    }

    const { root, type } = item as { root?: unknown; type?: unknown };

    if (typeof root !== 'string') {
      throw new Error(`AI 回傳了無效的和弦根音：${String(root)}`);
    }
    const normalizedRoot = normalizeNoteName(root);
    if (!normalizedRoot) {
      throw new Error(`AI 回傳了無效的和弦根音：${root}`);
    }
    if (typeof type !== 'string' || !isChordType(type)) {
      throw new Error(`AI 回傳了無效的和弦類型：${String(type)}`);
    }

    return { id: createChordId(), root: normalizedRoot, type, inversion: 0 };
  });
}

export async function generateChordProgression(
  apiKey: string,
  prompt: string,
  numChords: string
): Promise<ChordDefinition[]> {
  const countInstruction =
    numChords !== 'auto'
      ? `The progression must contain exactly ${parseInt(numChords, 10)} chords.`
      : 'The progression should contain between 4 and 8 chords.';

  const raw = await requestJson<unknown>({
    apiKey,
    contents: `User request: '${prompt}'`,
    systemInstruction:
      "You are an expert music theorist and composer. Your task is to generate a common chord progression based on the user's description. Your response MUST be in JSON format. " +
      countInstruction,
    buildSchema: buildChordArraySchema,
  });

  return validateChordSuggestions(raw);
}

export async function reharmonizeProgression(
  apiKey: string,
  progression: ChordDefinition[],
  style: string
): Promise<ChordDefinition[]> {
  const current = progression.map(c => `${c.root}${c.type}`).join(', ');

  const raw = await requestJson<unknown>({
    apiKey,
    contents: `Re-harmonize the following chord progression: [${current}] into a "${style}" style.`,
    systemInstruction:
      'You are a master music arranger. Your task is to re-harmonize a given chord progression into a new style specified by the user. You can use more advanced chords (e.g., sevenths, ninths, altered chords) and substitutions, but you must maintain the general harmonic flow and the same number of chords as the original. Your response MUST be a JSON array with the exact same structure and number of elements as the original progression.',
    buildSchema: buildChordArraySchema,
  });

  const chords = validateChordSuggestions(raw);

  if (chords.length !== progression.length) {
    throw new Error(`AI 回傳了 ${chords.length} 個和弦，但預期為 ${progression.length} 個。`);
  }

  return chords;
}

/**
 * Clamps each returned inversion into the valid range for its chord instead of
 * rejecting the whole response, because an out-of-range inversion is still a
 * usable musical suggestion.
 */
export function validateInversions(
  raw: unknown,
  progression: ChordDefinition[]
): number[] {
  if (!Array.isArray(raw) || raw.length !== progression.length) {
    throw new Error(`AI 回傳的資料無效，預期為 ${progression.length} 個數字的陣列。`);
  }

  return raw.map((inversion, index) => {
    if (typeof inversion !== 'number' || !Number.isFinite(inversion)) {
      throw new Error(`AI 為第 ${index + 1} 個和弦回傳了非數字的轉位值。`);
    }

    const maxInversion = (CHORD_INTERVALS[progression[index].type]?.length || 1) - 1;
    if (inversion < 0 || inversion > maxInversion) {
      console.warn(
        `[gemini] Inversion ${inversion} is out of range for chord ${index + 1}; clamping.`
      );
      return Math.max(0, Math.min(inversion, maxInversion));
    }
    return inversion;
  });
}

export async function chooseVoicings(
  apiKey: string,
  progression: ChordDefinition[],
  voicingOptions: { chord_name: string; voicings: { inversion: number; notes: string[] }[] }[]
): Promise<number[]> {
  const raw = await requestJson<unknown>({
    apiKey,
    contents: `Analyze this chord progression and determine the optimal inversion for each chord. Progression data with all possible voicings: ${JSON.stringify(voicingOptions)}`,
    systemInstruction:
      'You are a music arrangement expert specializing in voice leading. For each chord in the progression, you are given a list of possible voicings, each with an inversion number and the resulting MIDI-style note names (e.g., C4). Your task is to select one voicing (by its inversion number) for each chord. Your PRIMARY goal is to minimize melodic movement in the highest note between adjacent chords to create the smoothest possible voice leading. As a SECONDARY goal, if a chosen voicing results in most of its notes falling outside the B2 to C4 range, you should re-evaluate and select a different inversion that better fits this range, even if it slightly compromises the primary voice-leading goal. Your response MUST be a JSON array of numbers. The length of the array must be identical to the input progression\'s length. Each number represents the chosen inversion for the corresponding chord.',
    buildSchema: Type => ({ type: Type.ARRAY, items: { type: Type.INTEGER } }),
  });

  return validateInversions(raw, progression);
}

/** Note events are handed straight to Tone.Part, so reject malformed entries here. */
export function validateBassEvents(raw: unknown): AiNoteEvent[] {
  if (!Array.isArray(raw)) {
    throw new Error('AI 回傳的貝斯線資料不是陣列。');
  }

  return raw.map(event => {
    if (typeof event !== 'object' || event === null) {
      throw new Error('AI 回傳的貝斯音符格式不正確。');
    }
    const { note, time, duration } = event as Record<string, unknown>;
    if (typeof note !== 'string' || typeof time !== 'string' || typeof duration !== 'string') {
      throw new Error('AI 回傳的貝斯音符缺少 note、time 或 duration。');
    }
    return { note, time, duration };
  });
}

export async function generateBassline(
  apiKey: string,
  progression: ChordDefinition[],
  style: string
): Promise<AiNoteEvent[]> {
  const current = progression.map(c => `${c.root}${c.type}`).join(', ');

  const raw = await requestJson<unknown>({
    apiKey,
    contents: `Create a bassline for the chord progression [${current}]. The user wants a style described as: "${style}".`,
    systemInstruction: `You are a professional bass player. Your task is to create a monophonic bassline for a given chord progression. The bassline should be musically interesting, fit the user's description, and stay within a typical bass range (E1 to G3). The response MUST be a JSON array of note events. Each event is an object with "note" (e.g., "C2"), "time" (in "measure:beat:subdivision" format, e.g., "0:0:0"), and "duration" (e.g., "4n", "8n."). The total duration should match the progression length (${progression.length} measures).`,
    buildSchema: Type => ({
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          note: { type: Type.STRING, description: "The note to play, e.g., 'A2'" },
          time: { type: Type.STRING, description: 'The absolute time "M:B:S", e.g. "1:2:0"' },
          duration: { type: Type.STRING, description: 'The note duration, e.g., "8n"' },
        },
        required: ['note', 'time', 'duration'],
      },
    }),
  });

  return validateBassEvents(raw);
}

export async function generateDrumPattern(
  apiKey: string,
  prompt: string
): Promise<CustomDrumChordPattern> {
  const instruments = DRUM_INSTRUMENT_OPTIONS.map(opt => opt.value);

  const raw = await requestJson<Record<string, unknown>>({
    apiKey,
    contents: `User's request for a one-measure drum pattern: "${prompt}"`,
    systemInstruction: `You are an expert drum machine programmer. Your task is to generate a one-measure (16-step) drum pattern based on a user's text description. The response MUST be a JSON object. The keys of the object must be instrument names from the following list: [${instruments.join(', ')}]. The value for each key must be a 4x4 array of booleans, representing 4 beats, each with 4 subdivisions (16th notes). 'true' means a hit, 'false' means a rest.`,
    buildSchema: Type => ({
      type: Type.OBJECT,
      properties: instruments.reduce<Record<string, unknown>>((acc, value) => {
        acc[value] = {
          type: Type.ARRAY,
          items: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
        };
        return acc;
      }, {}),
    }),
  });

  return validateDrumPattern(raw, instruments);
}

/**
 * Keeps only recognised instruments whose grid is genuinely a 4x4 boolean matrix.
 * The sequencer indexes this as `[beat][subdivision]` without guarding, so a
 * ragged array from the model would throw during playback rather than at parse.
 */
export function validateDrumPattern(
  raw: unknown,
  allowedInstruments: DrumInstrument[]
): CustomDrumChordPattern {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('AI 回傳的鼓組資料格式不正確。');
  }

  const pattern: CustomDrumChordPattern = {};

  for (const instrument of allowedInstruments) {
    const grid = (raw as Record<string, unknown>)[instrument];
    if (!Array.isArray(grid)) continue;

    const normalised = grid
      .filter(Array.isArray)
      .map(beat => Array.from({ length: 4 }, (_, i) => beat[i] === true));

    if (normalised.length > 0) {
      // Pad or trim to exactly four beats so downstream indexing is always safe.
      pattern[instrument] = Array.from(
        { length: 4 },
        (_, i) => normalised[i] ?? [false, false, false, false]
      );
    }
  }

  if (Object.keys(pattern).length === 0) {
    throw new Error('AI 沒有回傳任何可用的鼓組樂器。');
  }

  return pattern;
}
