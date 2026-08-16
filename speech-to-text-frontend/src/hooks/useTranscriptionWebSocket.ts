import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamConnectionStatus } from '../types';

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

/*
 * IMPORTANT:
 * VITE_WS_URL must be configured in the frontend deployment.
 *
 * Example:
 * VITE_WS_URL=wss://voiceflow-backend-ur7c.onrender.com/ws/transcribe
 *
 * For local development:
 * ws://localhost:8080/ws/transcribe
 */
const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  'ws://localhost:8080/ws/transcribe';

export const useTranscriptionWebSocket = ({
  languageCode,
}: UseTranscriptionWebSocketProps): UseTranscriptionWebSocketReturn => {
  const [status, setStatus] =
    useState<StreamConnectionStatus>('DISCONNECTED');

  const [transcript, setTranscript] =
    useState<string>('');

  const [interimTranscript, setInterimTranscript] =
    useState<string>('');

  const [chunksSent, setChunksSent] =
    useState<number>(0);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const socketRef =
    useRef<WebSocket | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const isMountedRef =
    useRef<boolean>(true);

  /*
   * Keep the latest status available to WebSocket callbacks.
   * This avoids stale React state inside socket.onclose.
   */
  const statusRef =
    useRef<StreamConnectionStatus>('DISCONNECTED');

  const updateStatus = useCallback(
    (newStatus: StreamConnectionStatus) => {
      statusRef.current = newStatus;

      if (isMountedRef.current) {
        setStatus(newStatus);
      }
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /*
   * Stop microphone tracks.
   */
  const cleanupMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });

      mediaStreamRef.current = null;
    }
  }, []);

  /*
   * Close WebSocket.
   */
  const closeSocket = useCallback(() => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }

    socketRef.current = null;
  }, []);

  /*
   * Stop recording.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (
          mediaRecorderRef.current.state !== 'inactive'
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.warn(
          'Error stopping MediaRecorder:',
          error
        );
      }

      mediaRecorderRef.current = null;
    }

    cleanupMediaTracks();
    closeSocket();

    setInterimTranscript('');
    updateStatus('DISCONNECTED');
  }, [
    cleanupMediaTracks,
    closeSocket,
    updateStatus,
  ]);

  /*
   * Pause recording.
   */
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.pause();
    }

    updateStatus('PAUSED');
  }, [updateStatus]);

  /*
   * Clear transcript.
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setChunksSent(0);
    setErrorMessage(null);
  }, []);

  /*
   * Start recording.
   */
  const startRecording = useCallback(async () => {
    setErrorMessage(null);

    /*
     * Resume paused recording.
     */
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused' &&
      socketRef.current?.readyState === WebSocket.OPEN
    ) {
      mediaRecorderRef.current.resume();

      updateStatus('RECORDING');

      return;
    }

    /*
     * Clean previous session.
     */
    stopRecording();

    updateStatus('CONNECTING');

    try {
      /*
       * 1. Request microphone.
       */
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          'This browser does not support microphone access.'
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      mediaStreamRef.current = stream;

      /*
       * 2. Connect to deployed Spring Boot WebSocket.
       */
      const wsUrl =
        `${WS_BASE_URL}?language=${encodeURIComponent(
          languageCode
        )}`;

      console.log('Connecting WebSocket:', wsUrl);

      const socket =
        new WebSocket(wsUrl);

      socket.binaryType = 'arraybuffer';

      socketRef.current = socket;

      /*
       * 3. WebSocket connected.
       */
      socket.onopen = () => {
        console.log(
          'WebSocket connected successfully.'
        );

        if (!isMountedRef.current) {
          return;
        }

        updateStatus('RECORDING');

        /*
         * Determine supported audio format.
         */
        let mimeType = '';

        if (
          MediaRecorder.isTypeSupported(
            'audio/webm;codecs=opus'
          )
        ) {
          mimeType =
            'audio/webm;codecs=opus';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/webm'
          )
        ) {
          mimeType = 'audio/webm';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/ogg;codecs=opus'
          )
        ) {
          mimeType =
            'audio/ogg;codecs=opus';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/mp4'
          )
        ) {
          mimeType = 'audio/mp4';
        }

        console.log(
          'Selected audio MIME type:',
          mimeType
        );

        let recorder: MediaRecorder;

        try {
          recorder = mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
              )
            : new MediaRecorder(stream);
        } catch (error) {
          console.error(
            'Could not create MediaRecorder:',
            error
          );

          setErrorMessage(
            'Your browser does not support a compatible audio recording format.'
          );

          updateStatus('ERROR');

          return;
        }

        mediaRecorderRef.current =
          recorder;

        /*
         * 4. Send audio chunks to backend.
         */
        recorder.ondataavailable =
          async (event: BlobEvent) => {
            if (
              event.data.size === 0 ||
              socket.readyState !==
                WebSocket.OPEN
            ) {
              return;
            }

            try {
              const arrayBuffer =
                await event.data.arrayBuffer();

              socket.send(arrayBuffer);

              if (isMountedRef.current) {
                setChunksSent(
                  (previous) =>
                    previous + 1
                );
              }

              console.log(
                'Audio chunk sent:',
                event.data.size,
                'bytes'
              );
            } catch (error) {
              console.error(
                'Failed to send audio chunk:',
                error
              );
            }
          };

        /*
         * 5. Start recording.
         *
         * Every 250ms a chunk is generated.
         */
        recorder.start(250);

        console.log(
          'MediaRecorder started.'
        );
      };

      /*
       * IMPORTANT:
       * This is where the actual Whisper
       * transcription response is received.
       */
      socket.onmessage = (
        event: MessageEvent
      ) => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          const payload =
            JSON.parse(event.data);

          console.log(
            'WebSocket message:',
            payload
          );

          /*
           * Backend connection confirmation.
           */
          if (
            payload.type === 'STATUS' &&
            payload.status === 'CONNECTED'
          ) {
            updateStatus('RECORDING');

            return;
          }

          /*
           * THIS WAS MISSING IN YOUR ORIGINAL CODE.
           *
           * Backend sends:
           *
           * {
           *   "type": "TRANSCRIPTION_DELTA",
           *   "delta": "...",
           *   "fullText": "..."
           * }
           */
          if (
            payload.type ===
            'TRANSCRIPTION_DELTA'
          ) {
            const delta =
              payload.delta || '';

            const fullText =
              payload.fullText || '';

            console.log(
              'Whisper transcription:',
              payload
            );

            /*
             * Prefer backend fullText.
             */
            if (fullText) {
              setTranscript(fullText);
            } else if (delta) {
              setTranscript(
                (previous) =>
                  previous
                    ? `${previous} ${delta}`.trim()
                    : delta.trim()
              );
            }

            /*
             * Backend has already produced
             * a real transcription.
             */
            setInterimTranscript('');

            updateStatus('RECORDING');

            return;
          }

          /*
           * Backend error.
           */
          if (
            payload.type === 'ERROR'
          ) {
            console.error(
              'Backend WebSocket error:',
              payload
            );

            setErrorMessage(
              payload.message ||
                'Transcription server error.'
            );

            updateStatus('ERROR');

            return;
          }
        } catch (error) {
          console.warn(
            'Could not parse WebSocket message:',
            event.data
          );
        }
      };

      /*
       * WebSocket error.
       */
      socket.onerror = (event) => {
        console.error(
          'WebSocket error:',
          event
        );

        if (isMountedRef.current) {
          setErrorMessage(
            `Could not connect to transcription server: ${wsUrl}`
          );

          updateStatus('ERROR');
        }
      };

      /*
       * WebSocket closed.
       */
      socket.onclose = (event) => {
        console.log(
          'WebSocket closed:',
          event.code,
          event.reason
        );

        if (
          isMountedRef.current &&
          statusRef.current !==
            'DISCONNECTED'
        ) {
          updateStatus('DISCONNECTED');
        }
      };
    } catch (error: any) {
      console.error(
        'Failed to initialize recording:',
        error
      );

      if (isMountedRef.current) {
        if (
          error.name ===
            'NotAllowedError' ||
          error.name ===
            'PermissionDeniedError'
        ) {
          setErrorMessage(
            'Microphone access denied. Please allow microphone access in your browser settings.'
          );
        } else {
          setErrorMessage(
            error.message ||
              'Failed to start microphone recording.'
          );
        }

        updateStatus('ERROR');
      }

      cleanupMediaTracks();
      closeSocket();
    }
  }, [
    languageCode,
    stopRecording,
    updateStatus,
    cleanupMediaTracks,
    closeSocket,
  ]);

  /*
   * Cleanup when component unmounts.
   */
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