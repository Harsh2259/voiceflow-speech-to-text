package com.procucev.transcriptionbackend.controller;

import com.procucev.transcriptionbackend.dto.TranscriptionDto;
import com.procucev.transcriptionbackend.dto.TranscriptionRequest;
import com.procucev.transcriptionbackend.service.TranscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for managing historical transcriptions.
 */
@RestController
@RequestMapping("/api/v1/transcriptions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "*"})
@RequiredArgsConstructor
@Slf4j
public class TranscriptionController {

    private final TranscriptionService transcriptionService;

    /**
     * Create a new saved transcription record.
     */
    @PostMapping
    public ResponseEntity<TranscriptionDto> createTranscription(
            @Valid @RequestBody TranscriptionRequest request) {
        log.info("Received request to persist transcription for language: {}", request.getLanguageCode());
        TranscriptionDto created = transcriptionService.createTranscription(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    /**
     * Retrieve list of transcriptions, optionally filtered by language code.
     */
    @GetMapping
    public ResponseEntity<List<TranscriptionDto>> getAllTranscriptions(
            @RequestParam(required = false) String language) {
        log.info("Fetching transcription records with language filter: {}", language);
        List<TranscriptionDto> list = transcriptionService.getAllTranscriptions(language);
        return ResponseEntity.ok(list);
    }

    /**
     * Retrieve a single transcription by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<TranscriptionDto> getTranscriptionById(@PathVariable Long id) {
        log.info("Fetching transcription record with ID: {}", id);
        TranscriptionDto dto = transcriptionService.getTranscriptionById(id);
        return ResponseEntity.ok(dto);
    }

    /**
     * Delete a transcription by its ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTranscription(@PathVariable Long id) {
        log.info("Deleting transcription record with ID: {}", id);
        transcriptionService.deleteTranscription(id);
        return ResponseEntity.ok(Collections.singletonMap("deleted", true));
    }
}
