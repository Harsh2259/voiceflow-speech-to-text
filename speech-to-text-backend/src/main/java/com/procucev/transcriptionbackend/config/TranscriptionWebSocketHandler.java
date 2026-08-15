package com.procucev.transcriptionbackend.config;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.procucev.transcriptionbackend.dto.TranscriptionRequest;
import com.procucev.transcriptionbackend.service.TranscriptionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * WebSocket handler for real-time speech transcription.
 *
 * Receives WebM/Opus audio chunks from the React frontend,
 * sends accumulated audio to the local faster-whisper service,
 * and returns real transcription results to the browser.
 *
 * Whisper service:
 * http://127.0.0.1:8001/transcribe
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TranscriptionWebSocketHandler extends BinaryWebSocketHandler {

    
private static final String WHISPER_URL =
        System.getenv().getOrDefault(
                "WHISPER_URL",
                "http://127.0.0.1:8001/transcribe"
        );

    /*
     * React currently sends a chunk every 250ms.
     * 8 chunks ≈ 2 seconds of audio.
     */
    private static final int TRANSCRIPTION_INTERVAL_CHUNKS = 8;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final TranscriptionService transcriptionService;

    private final RestClient restClient = RestClient.builder().build();

    /**
     * Active WebSocket sessions.
     */
    private final Map<String, SessionStreamContext> sessionContextMap =
            new ConcurrentHashMap<>();

    /**
     * State belonging to one WebSocket connection.
     */
    private static class SessionStreamContext {

        final String language;

        final AtomicInteger chunkCounter =
                new AtomicInteger(0);

        final ByteArrayOutputStream audioBuffer =
                new ByteArrayOutputStream();

        final StringBuilder accumulatedText =
                new StringBuilder();

        /*
         * Prevents multiple transcription requests from running
         * against the same session simultaneously.
         */
        boolean transcriptionInProgress = false;

        SessionStreamContext(String language) {
            this.language =
                    language != null && !language.isBlank()
                            ? language
                            : "en-US";
        }
    }

    /**
     * Called when the browser establishes the WebSocket connection.
     */
    @Override
    public void afterConnectionEstablished(
            WebSocketSession session) throws Exception {

        String language = extractLanguageFromSession(session);

        SessionStreamContext context =
                new SessionStreamContext(language);

        sessionContextMap.put(
                session.getId(),
                context
        );

        log.info(
                "WebSocket connection established. Session ID: {}, Language: {}",
                session.getId(),
                language
        );

        Map<String, Object> payload =
                new HashMap<>();

        payload.put("type", "STATUS");
        payload.put("status", "CONNECTED");
        payload.put(
                "message",
                "Connected to real-time local Whisper transcription service"
        );
        payload.put("language", language);
        payload.put(
                "timestamp",
                Instant.now().toEpochMilli()
        );

        sendJson(session, payload);
    }

    /**
     * Receives binary audio chunks from React.
     */
    @Override
    protected void handleBinaryMessage(
            WebSocketSession session,
            BinaryMessage message) throws Exception {

        SessionStreamContext context =
                sessionContextMap.get(session.getId());

        if (context == null) {
            log.warn(
                    "Received audio for unknown session: {}",
                    session.getId()
            );
            return;
        }

        ByteBuffer buffer = message.getPayload();

        byte[] audioBytes = new byte[buffer.remaining()];
        buffer.get(audioBytes);

        if (audioBytes.length == 0) {
            return;
        }

        synchronized (context.audioBuffer) {
            context.audioBuffer.write(audioBytes);
        }

        int chunkNumber =
                context.chunkCounter.incrementAndGet();

        log.debug(
                "Received audio chunk #{} ({} bytes) from session {}",
                chunkNumber,
                audioBytes.length,
                session.getId()
        );

        /*
         * Every ~2 seconds send accumulated audio to Whisper.
         */
        if (chunkNumber % TRANSCRIPTION_INTERVAL_CHUNKS == 0) {

            byte[] audioToTranscribe;

            synchronized (context.audioBuffer) {
                audioToTranscribe =
                        context.audioBuffer.toByteArray();
            }

            transcribeAsync(
                    session,
                    context,
                    audioToTranscribe,
                    false
            );
        }
    }

    /**
     * Sends accumulated audio to the local Whisper service.
     */
    private void transcribeAsync(
            WebSocketSession session,
            SessionStreamContext context,
            byte[] audioBytes,
            boolean finalRequest) {

        synchronized (context) {

            if (context.transcriptionInProgress) {
                log.debug(
                        "Whisper transcription already running for session {}",
                        session.getId()
                );
                return;
            }

            context.transcriptionInProgress = true;
        }

        /*
         * Run Whisper outside the WebSocket I/O thread.
         */
        Thread.startVirtualThread(() -> {

            try {

                log.info(
                        "Sending {} bytes to Whisper. Session={}, final={}",
                        audioBytes.length,
                        session.getId(),
                        finalRequest
                );

                String boundary = "----VoiceflowBoundary"
                        + System.currentTimeMillis();

                byte[] requestBody =
                        buildMultipartBody(
                                boundary,
                                audioBytes,
                                context.language
                        );

                String response =
                        restClient.post()
                                .uri(WHISPER_URL)
                                .contentType(
                                        MediaType.parseMediaType(
                                                "multipart/form-data; boundary="
                                                        + boundary
                                        )
                                )
                                .body(requestBody)
                                .retrieve()
                                .body(String.class);

                log.debug(
                        "Whisper response for session {}: {}",
                        session.getId(),
                        response
                );

                JsonNode json =
                        objectMapper.readTree(response);

                String text =
                        json.path("text")
                                .asText("")
                                .trim();

                String detectedLanguage =
                        json.path("language")
                                .asText(context.language);

                if (!text.isBlank()) {

                    /*
                     * Prevent sending exactly the same text repeatedly.
                     */
                    boolean isNewText;

                    synchronized (context) {

                        String existing =
                                context.accumulatedText
                                        .toString()
                                        .trim();

                        isNewText =
                                !text.equals(existing)
                                        && !existing.endsWith(text);

                        if (isNewText) {

                            if (existing.isBlank()) {
                                context.accumulatedText
                                        .append(text);
                            } else {
                                context.accumulatedText
                                        .append(" ")
                                        .append(text);
                            }
                        }
                    }

                    if (isNewText && session.isOpen()) {

                        Map<String, Object> payload =
                                new HashMap<>();

                        payload.put(
                                "type",
                                "TRANSCRIPTION_DELTA"
                        );

                        payload.put(
                                "delta",
                                text
                        );

                        payload.put(
                                "fullText",
                                context.accumulatedText
                                        .toString()
                                        .trim()
                        );

                        payload.put(
                                "isFinal",
                                finalRequest
                        );

                        payload.put(
                                "language",
                                detectedLanguage
                        );

                        payload.put(
                                "chunkNumber",
                                context.chunkCounter.get()
                        );

                        payload.put(
                                "timestamp",
                                Instant.now().toEpochMilli()
                        );

                        sendJson(
                                session,
                                payload
                        );
                    }
                }

            } catch (Exception exception) {

                log.error(
                        "Whisper transcription failed for session {}",
                        session.getId(),
                        exception
                );

                if (session.isOpen()) {

                    Map<String, Object> error =
                            new HashMap<>();

                    error.put(
                            "type",
                            "ERROR"
                    );

                    error.put(
                            "message",
                            "Whisper transcription failed: "
                                    + exception.getMessage()
                    );

                    error.put(
                            "timestamp",
                            Instant.now().toEpochMilli()
                    );

                    try {
                        sendJson(session, error);
                    } catch (Exception ignored) {
                        log.debug(
                                "Unable to send Whisper error to client",
                                ignored
                        );
                    }
                }

            } finally {

                synchronized (context) {
                    context.transcriptionInProgress = false;
                }
            }
        });
    }

    /**
     * Creates a multipart/form-data request manually.
     *
     * This avoids adding another HTTP multipart dependency.
     */
    private byte[] buildMultipartBody(
            String boundary,
            byte[] audioBytes,
            String language) throws IOException {

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        String fileHeader =
                "--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; "
                        + "name=\"file\"; filename=\"audio.webm\"\r\n"
                        + "Content-Type: audio/webm\r\n\r\n";

        output.write(
                fileHeader.getBytes(StandardCharsets.UTF_8)
        );

        output.write(audioBytes);

        output.write(
                "\r\n".getBytes(StandardCharsets.UTF_8)
        );

        String languagePart =
                "--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; "
                        + "name=\"language\"\r\n\r\n"
                        + language
                        + "\r\n";

        output.write(
                languagePart.getBytes(StandardCharsets.UTF_8)
        );

        String ending =
                "--" + boundary + "--\r\n";

        output.write(
                ending.getBytes(StandardCharsets.UTF_8)
        );

        return output.toByteArray();
    }

    /**
     * Save the completed transcription into MySQL.
     */
    private void saveFinalTranscription(
            SessionStreamContext context) {

        String finalText =
                context.accumulatedText
                        .toString()
                        .trim();

        if (finalText.isBlank()) {
            log.info(
                    "No transcription text to save."
            );
            return;
        }

        try {

            TranscriptionRequest request =
                    new TranscriptionRequest();

            request.setOriginalText(finalText);
            request.setLanguageCode(context.language);

            transcriptionService.createTranscription(request);

            log.info(
                    "Saved transcription to MySQL. Language={}, Characters={}",
                    context.language,
                    finalText.length()
            );

        } catch (Exception exception) {

            log.error(
                    "Failed to save transcription to MySQL",
                    exception
            );
        }
    }

    /**
     * Called when the WebSocket connection closes.
     */
    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status) throws Exception {

        SessionStreamContext context =
                sessionContextMap.remove(session.getId());

        if (context != null) {

            /*
             * Save whatever has already been transcribed.
             *
             * The frontend normally stops the MediaRecorder before
             * closing the WebSocket, so the periodic Whisper requests
             * should already contain most of the recording.
             */
            saveFinalTranscription(context);

            log.info(
                    "WebSocket connection closed. Session ID={}, "
                            + "Status={}, Chunks={}, Characters={}",
                    session.getId(),
                    status,
                    context.chunkCounter.get(),
                    context.accumulatedText.length()
            );
        }
    }

    /**
     * Handle WebSocket transport errors.
     */
    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception) throws Exception {

        log.error(
                "WebSocket transport error for session {}",
                session.getId(),
                exception
        );

        if (session.isOpen()) {

            Map<String, Object> error =
                    new HashMap<>();

            error.put("type", "ERROR");

            error.put(
                    "message",
                    "WebSocket transport failure: "
                            + exception.getMessage()
            );

            error.put(
                    "timestamp",
                    Instant.now().toEpochMilli()
            );

            sendJson(session, error);

            session.close(
                    CloseStatus.SERVER_ERROR
            );
        }
    }

    /**
     * Extract language from:
     *
     * /ws/transcribe?language=en-US
     */
    private String extractLanguageFromSession(
            WebSocketSession session) {

        URI uri = session.getUri();

        if (uri != null && uri.getQuery() != null) {

            for (String parameter :
                    uri.getQuery().split("&")) {

                String[] pair =
                        parameter.split("=", 2);

                if (pair.length == 2
                        && "language"
                        .equalsIgnoreCase(pair[0])) {

                    return URLDecoder.decode(
                            pair[1],
                            StandardCharsets.UTF_8
                    );
                }
            }
        }

        return "en-US";
    }

    /**
     * Safely send JSON through WebSocket.
     */
    private void sendJson(
            WebSocketSession session,
            Map<String, Object> payload)
            throws IOException {

        synchronized (session) {

            if (session.isOpen()) {

                session.sendMessage(
                        new TextMessage(
                                objectMapper.writeValueAsString(
                                        payload
                                )
                        )
                );
            }
        }
    }
}