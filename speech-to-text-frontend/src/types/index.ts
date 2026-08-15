/**
 * Core domain types for Speech-to-Text application
 */

export interface Transcription {
  id: number;
  originalText: string;
  languageCode: string;
  createdAt: string;
}

export interface TranscriptionRequest {
  originalText: string;
  languageCode: string;
}

export type StreamConnectionStatus = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECORDING'
  | 'PAUSED'
  | 'ERROR';

export interface WebSocketMessage {
  type: 'STATUS' | 'TRANSCRIPTION_DELTA' | 'ERROR';
  status?: string;
  message?: string;
  delta?: string;
  fullText?: string;
  isFinal?: boolean;
  chunkNumber?: number;
  language?: string;
  timestamp?: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (United States)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish (Spain / Latino)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French (France)', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German (Germany)', flag: '🇩🇪' },
  { code: 'hi-IN', name: 'Hindi (India)', flag: '🇮🇳' },
  { code: 'ja-JP', name: 'Japanese (Japan)', flag: '🇯🇵' },
];
