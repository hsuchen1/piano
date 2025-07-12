
import React, { useState, useEffect } from 'react';

interface ApiSettingsProps {
  apiKey: string | null;
  onApiKeyChange: (key: string | null) => void;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKey, onApiKeyChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(!!apiKey);

  useEffect(() => {
    setIsKeySaved(!!apiKey);
  }, [apiKey]);

  const handleSave = () => {
    if (inputValue.trim()) {
      const trimmedKey = inputValue.trim();
      localStorage.setItem('gemini_api_key', trimmedKey);
      onApiKeyChange(trimmedKey);
      setInputValue('');
      alert('API 金鑰已儲存至您的瀏覽器。');
    }
  };

  const handleClear = () => {
    if (window.confirm('確定要清除已儲存的 API 金鑰嗎？')) {
      localStorage.removeItem('gemini_api_key');
      onApiKeyChange(null);
      alert('API 金鑰已清除。');
    }
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-3">
      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
        API 金鑰設定
      </h3>
      <p className="text-xs text-gray-400">
        此金鑰將僅儲存在您本機的瀏覽器中，不會上傳。這是為了讓部署到公開網站後，您能安全地使用 AI 功能。
      </p>
      <div className="flex items-center space-x-2">
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow p-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-yellow-500 focus:border-yellow-500 transition-colors placeholder-gray-400"
          placeholder="貼上您的 Gemini API 金鑰"
          aria-label="Gemini API Key Input"
        />
        <button
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          儲存
        </button>
      </div>
      {isKeySaved ? (
        <div className="flex items-center justify-between text-sm text-green-400">
          <span>狀態：API 金鑰已設定。</span>
          <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 underline">
            清除金鑰
          </button>
        </div>
      ) : (
        <p className="text-sm text-yellow-400">狀態：尚未設定 API 金鑰。AI 功能將無法使用。</p>
      )}
    </div>
  );
};

export default ApiSettings;
