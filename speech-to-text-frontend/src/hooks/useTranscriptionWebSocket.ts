import { useState, useRef, useCallback, useEffect } from 'react';
import { StreamConnectionStatus, WebSocketMessage } from '../types';

interface UseTranscriptionWebSocketProps {
  languageCode: string;
}

interface UseTranscriptionWebSocketReturn {
  status: StreamConnectionStatus;
  transcript: string;
  interimTranscript: string;
  chunksSent: number;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  clearTranscript: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/transcribe';

// SpeechRecognition type declarations for browser compatibility
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

/**
 * Custom hook to manage real microphone speech recognition combined with
 * 250ms audio chunk WebSocket streaming to the Spring Boot backend.
 */
export const useTranscriptionWebSocket = ({
  languageCode,
}: UseTranscriptionWebSocketProps): UseTranscriptionWebSocketReturn => {
  const [status, setStatus] = useState<StreamConnectionStatus>('DISCONNECTED');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [chunksSent, setChunksSent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Web API references
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognizerRef = useRef<any>(null);

  // Unmount tracker
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Safely stop microphone stream
   */
  const cleanupMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  /**
   * Clean up and close WebSocket connection
   */
  const closeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);

  /**
   * Stop active speech recognition and recording session
   */
  const stopRecording = useCallback(() => {
    // 1. Stop Speech Recognizer
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (err) {
        // ignore
      }
      speechRecognizerRef.current = null;
    }

    // 2. Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
      mediaRecorderRef.current = null;
    }

    cleanupMediaTracks();
    closeSocket();

    if (isMountedRef.current) {
      setStatus('DISCONNECTED');
      setInterimTranscript('');
    }
  }, [cleanupMediaTracks, closeSocket]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (isMountedRef.current) {
      setStatus('PAUSED');
    }
  }, []);

  /**
   * Reset transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setChunksSent(0);
    setErrorMessage(null);
  }, []);

  /**
   * Start capturing live microphone audio and real-time voice speech recognition
   */
  const startRecording = useCallback(async () => {
    setErrorMessage(null);

    // If currently paused, resume
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused' &&
      socketRef.current?.readyState === WebSocket.OPEN
    ) {
      mediaRecorderRef.current.resume();
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.start();
        } catch (e) {}
      }
      setStatus('RECORDING');
      return;
    }

    stopRecording();

    if (isMountedRef.current) {
      setStatus('CONNECTING');
    }

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Connect to Spring Boot WebSocket proxy
      const wsUrl = `${WS_BASE_URL}?language=${encodeURIComponent(languageCode)}`;
      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('RECORDING');

        // 3. Start MediaRecorder (250ms binary chunks sent to Spring Boot WebSocket)
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (event: BlobEvent) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            try {
              const arrayBuffer = await event.data.arrayBuffer();
              socket.send(arrayBuffer);
              if (isMountedRef.current) {
                setChunksSent((prev) => prev + 1);
              }
            } catch (err) {
              console.error('Failed to send audio chunk:', err);
            }
          }
        };

        recorder.start(250);

        // 4. Initialize Real Speech-to-Text Recognition Engine
        const win = window as unknown as IWindow;
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (SpeechRecognition) {
          const recognizer = new SpeechRecognition();
          speechRecognizerRef.current = recognizer;
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = languageCode;

          recognizer.onresult = (event: any) => {
            let interim = '';
            let finalAccumulated = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptPiece = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalAccumulated += transcriptPiece + ' ';
              } else {
                interim += transcriptPiece;
              }
            }

            if (isMountedRef.current) {
              if (finalAccumulated) {
                setTranscript((prev) => (prev ? `${prev.trim()} ${finalAccumulated.trim()}` : finalAccumulated.trim()));
              }
              setInterimTranscript(interim);
            }
          };

          recognizer.onerror = (event: any) => {
            console.warn('Speech recognition warning/error:', event.error);
            if (event.error === 'not-allowed') {
              setErrorMessage('Microphone permission was blocked. Please enable it in browser settings.');
            }
          };

          recognizer.onend = () => {
            // Keep speech recognizer alive while still in recording mode
            if (isMountedRef.current && mediaRecorderRef.current?.state === 'recording') {
              try {
                recognizer.start();
              } catch (e) {}
            }
          };

          recognizer.start();
        } else {
          console.warn('Web Speech API is not supported in this browser; falling back to WebSocket proxy simulation.');
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;
        try {
          const payload: WebSocketMessage = JSON.parse(event.data);
          if (payload.type === 'STATUS' && payload.status === 'CONNECTED') {
            setStatus('RECORDING');
          } else if (payload.type === 'ERROR') {
            setErrorMessage(payload.message || 'Error from WebSocket proxy');
            setStatus('ERROR');
          }
        } catch (err) {
          // ignore non-JSON message
        }
      };

      socket.onerror = () => {
        if (isMountedRef.current) {
          setErrorMessage('Could not connect to WebSocket proxy at ' + WS_BASE_URL);
          setStatus('ERROR');
        }
      };

      socket.onclose = () => {
        if (isMountedRef.current && status !== 'DISCONNECTED') {
          setStatus('DISCONNECTED');
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize microphone or WebSocket:', err);
      if (isMountedRef.current) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Microphone access denied. Please click the lock/settings icon in your address bar and allow microphone access.');
        } else {
          setErrorMessage(err.message || 'Failed to start microphone recording.');
        }
        setStatus('ERROR');
      }
      stopRecording();
    }
  }, [languageCode, status, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    status,
    transcript,
    interimTranscript,
    chunksSent,
    errorMessage,
    startRecording,
    stopRecording,
    pauseRecording,
    clearTranscript,
  };
};
