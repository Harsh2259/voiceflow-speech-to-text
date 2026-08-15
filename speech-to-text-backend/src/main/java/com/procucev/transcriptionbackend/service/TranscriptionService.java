package com.procucev.transcriptionbackend.service;

import com.procucev.transcriptionbackend.dto.TranscriptionDto;
import com.procucev.transcriptionbackend.dto.TranscriptionRequest;

import java.util.List;

/**
 * Service interface defining business logic operations for speech transcriptions.
 */
public interface TranscriptionService {

    /**
     * Create and persist a new transcription.
     *
     * @param request the transcription payload
     * @return the saved transcription DTO
     */
    TranscriptionDto createTranscription(TranscriptionRequest request);

    /**
     * Retrieve all saved transcriptions, ordered by newest first.
     *
     * @param languageCode optional language filter
     * @return list of transcription DTOs
     */
    List<TranscriptionDto> getAllTranscriptions(String languageCode);

    /**
     * Retrieve a specific transcription by its ID.
     *
     * @param id the transcription ID
     * @return the matching transcription DTO
     */
    TranscriptionDto getTranscriptionById(Long id);

    /**
     * Delete a transcription by its ID.
     *
     * @param id the transcription ID
     */
    void deleteTranscription(Long id);
}
