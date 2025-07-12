
import React, { useState } from 'react';

interface GeminiChordGeneratorProps {
  onGenerate: (prompt: string, numChords: string) => Promise<void>;
  isGenerating: boolean;
  generationError: string | null;
  isApiKeySet: boolean;
}

const GeminiChordGenerator: React.FC<GeminiChordGeneratorProps> = ({ onGenerate, isGenerating, generationError, isApiKeySet }) => {
  const [prompt, setPrompt] = useState('');
  const [numChords, setNumChords] = useState('auto');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating && isApiKeySet) {
      onGenerate(prompt.trim(), numChords);
    }
  };

  const isEffectivelyDisabled = isGenerating || !prompt.trim() || !isApiKeySet;

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-4">
      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        AI 智慧創作
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-300 mb-1">
            描述您想要的音樂感覺
          </label>
          <textarea
            id="ai-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-400 disabled:opacity-50"
            placeholder="例如：一首輕快的流行歌、悲傷的電影配樂、4個和弦的爵士樂..."
            disabled={isGenerating || !isApiKeySet}
            aria-describedby="ai-prompt-description"
          />
           <p id="ai-prompt-description" className="text-xs text-gray-400 mt-1">AI 將會取代目前的和弦進行。</p>
        </div>

        <div>
          <label htmlFor="num-chords" className="block text-sm font-medium text-gray-300 mb-1">
            和弦數量 (選填)
          </label>
          <select
            id="num-chords"
            value={numChords}
            onChange={(e) => setNumChords(e.target.value)}
            className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:opacity-50"
            disabled={isGenerating || !isApiKeySet}
            aria-label="選擇要生成的和弦數量"
          >
            <option value="auto">自動 (4-8個)</option>
            {Array.from({ length: 19 }, (_, i) => i + 2).map(num => (
                <option key={num} value={num}>{num} 個和弦</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isEffectivelyDisabled}
          className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
          title={!isApiKeySet ? "請先在上方設定 API 金鑰" : ""}
        >
          {isGenerating && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isGenerating ? '創作中...' : '生成和弦進行'}
        </button>
        {generationError && (
          <div className="p-2 bg-red-800/50 border border-red-700 rounded-md text-xs text-red-300 text-center" role="alert">
            {generationError}
          </div>
        )}
      </form>
    </div>
  );
};

export default GeminiChordGenerator;
