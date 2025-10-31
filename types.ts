export enum AgentStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export enum Speaker {
  USER = 'USER',
  AGENT = 'AGENT',
}

export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}
