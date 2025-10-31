import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AgentStatus, Speaker, TranscriptEntry } from '../types';

// Helper functions for audio encoding/decoding, must be defined outside the component scope
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface UseVoiceAgentProps {
  language: string;
}

export const useVoiceAgent = ({ language }: UseVoiceAgentProps) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextAudioStartTimeRef = useRef<number>(0);

  const inputTranscriptionRef = useRef('');
  const outputTranscriptionRef = useRef('');
  
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
     if (typeof process.env.API_KEY !== 'string') {
        setError("API_KEY environment variable not set.");
        setAgentStatus(AgentStatus.ERROR);
        return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const cleanup = useCallback(() => {
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if(mediaStreamSourceRef.current && scriptProcessorRef.current){
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(console.error);
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(console.error);
    }
    
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;

    setIsSessionActive(false);
    setAgentStatus(AgentStatus.IDLE);
    sessionPromiseRef.current = null;
    nextAudioStartTimeRef.current = 0;
  }, []);

  const stopSession = useCallback(async () => {
    setError(null);
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error('Error closing session:', e);
        setError(`Failed to close session: ${e instanceof Error ? e.message : String(e)}`);
        setAgentStatus(AgentStatus.ERROR);
      } finally {
        cleanup();
      }
    } else {
        cleanup();
    }
  }, [cleanup]);

  const startSession = useCallback(async () => {
    if (!aiRef.current) {
      setError("AI client not initialized.");
      setAgentStatus(AgentStatus.ERROR);
      return;
    }

    setAgentStatus(AgentStatus.CONNECTING);
    setError(null);
    setTranscript([]);

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsSessionActive(true);

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const systemInstruction = `You are a helpful and friendly sales and marketing assistant for a leading tech company. Your goal is to engage potential customers, answer their questions about our products, and highlight the benefits. Please conduct the entire conversation in ${language}. Be professional, yet approachable.`;

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setAgentStatus(AgentStatus.LISTENING);
            const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle interruptions
            if (message.serverContent?.interrupted) {
              playingAudioSourcesRef.current.forEach(source => source.stop());
              playingAudioSourcesRef.current.clear();
              nextAudioStartTimeRef.current = 0;
            }

            if(message.serverContent?.modelTurn?.parts[0]?.inlineData?.data){
                setAgentStatus(AgentStatus.SPEAKING);
            }

            // Handle audio playback
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBytes = decode(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, outputAudioContextRef.current!, 24000, 1);
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current!.destination);

              const currentTime = outputAudioContextRef.current!.currentTime;
              const startTime = Math.max(currentTime, nextAudioStartTimeRef.current);
              source.start(startTime);
              nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
              playingAudioSourcesRef.current.add(source);
              source.onended = () => {
                playingAudioSourcesRef.current.delete(source);
                if(playingAudioSourcesRef.current.size === 0) {
                    setAgentStatus(AgentStatus.LISTENING);
                }
              };
            }
            
             // Handle transcriptions
            const inputTrans = message.serverContent?.inputTranscription;
            if (inputTrans) {
                inputTranscriptionRef.current += inputTrans.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === Speaker.USER && !last.isFinal) {
                        return [...prev.slice(0, -1), { speaker: Speaker.USER, text: inputTranscriptionRef.current, isFinal: false }];
                    }
                    return [...prev, { speaker: Speaker.USER, text: inputTranscriptionRef.current, isFinal: false }];
                });
            }

            const outputTrans = message.serverContent?.outputTranscription;
             if (outputTrans) {
                outputTranscriptionRef.current += outputTrans.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === Speaker.AGENT && !last.isFinal) {
                        return [...prev.slice(0, -1), { speaker: Speaker.AGENT, text: outputTranscriptionRef.current, isFinal: false }];
                    }
                    return [...prev, { speaker: Speaker.AGENT, text: outputTranscriptionRef.current, isFinal: false }];
                });
            }

            if(message.serverContent?.turnComplete) {
                if (inputTranscriptionRef.current) {
                    setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.speaker === Speaker.USER) {
                           return [...prev.slice(0,-1), { ...last, text: inputTranscriptionRef.current, isFinal: true }];
                        }
                        return prev;
                    });
                }
                if (outputTranscriptionRef.current) {
                     setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.speaker === Speaker.AGENT) {
                           return [...prev.slice(0,-1), { ...last, text: outputTranscriptionRef.current, isFinal: true }];
                        }
                        return prev;
                    });
                }
                inputTranscriptionRef.current = '';
                outputTranscriptionRef.current = '';
            }

          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Session error: ${e.message}`);
            setAgentStatus(AgentStatus.ERROR);
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed');
            cleanup();
          },
        },
      });
    } catch (e) {
      console.error('Failed to start session:', e);
      setError(`Failed to start session: ${e instanceof Error ? e.message : String(e)}`);
      setAgentStatus(AgentStatus.ERROR);
      cleanup();
    }
  }, [language, cleanup, stopSession]);

  return { isSessionActive, agentStatus, transcript, error, startSession, stopSession };
};
