import React, { useEffect, useRef } from 'react';
import { Speaker, TranscriptEntry } from '../types';

interface TranscriptProps {
  transcript: TranscriptEntry[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-4">
      {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            <p className="mt-4 text-lg">Your conversation will appear here.</p>
            <p className="text-sm">Click "Start Session" to begin.</p>
          </div>
        ) : (
        transcript.map((entry, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              entry.speaker === Speaker.USER ? 'justify-end' : 'justify-start'
            }`}
          >
            {entry.speaker === Speaker.AGENT && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              </div>
            )}
            <div
              className={`max-w-md p-3 rounded-2xl ${
                entry.speaker === Speaker.USER
                  ? 'bg-blue-600/80 rounded-br-none'
                  : 'bg-gray-700/80 rounded-bl-none'
              } ${entry.isFinal ? 'opacity-100' : 'opacity-60'}`}
            >
              <p className="text-white whitespace-pre-wrap">{entry.text}</p>
            </div>
             {entry.speaker === Speaker.USER && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
            )}
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Transcript;
