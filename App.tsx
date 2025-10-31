import React, { useState } from 'react';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { SUPPORTED_LANGUAGES } from './constants';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import Transcript from './components/Transcript';
import StatusIndicator from './components/StatusIndicator';
import { AgentStatus } from './types';

const App: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].name);
  const {
    isSessionActive,
    agentStatus,
    transcript,
    error,
    startSession,
    stopSession,
  } = useVoiceAgent({ language: selectedLanguage });

  const handleStartStop = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center font-sans">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-screen p-4 md:p-6">
        <Header />

        <main className="flex-grow flex flex-col bg-gray-800/50 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
              isDisabled={isSessionActive}
            />
            <StatusIndicator status={agentStatus} />
          </div>

          <Transcript transcript={transcript} />

          {error && <div className="p-4 bg-red-500/20 text-red-300 text-sm">{error}</div>}

          <div className="p-4 border-t border-gray-700 mt-auto">
            <button
              onClick={handleStartStop}
              disabled={agentStatus === AgentStatus.CONNECTING}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-3 focus:outline-none focus:ring-4 ${
                isSessionActive
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50'
              } ${agentStatus === AgentStatus.CONNECTING ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSessionActive ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                  </svg>
                  <span>Stop Session</span>
                </>
              ) : (
                <>
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  <span>Start Session</span>
                </>
              )}
            </button>
          </div>
        </main>
        <footer className="text-center text-xs text-gray-500 pt-4">
          Powered by Gemini API
        </footer>
      </div>
    </div>
  );
};

export default App;
