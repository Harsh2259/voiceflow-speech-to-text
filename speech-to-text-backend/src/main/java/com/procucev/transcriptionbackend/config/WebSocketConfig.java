package com.procucev.transcriptionbackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket Configuration registering the binary transcription handler
 * and setting allowed origins for CORS compliance.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final TranscriptionWebSocketHandler transcriptionWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(transcriptionWebSocketHandler, "/ws/transcribe")
                .setAllowedOrigins("http://localhost:5173", "http://localhost:3000", "*");
    }
}
