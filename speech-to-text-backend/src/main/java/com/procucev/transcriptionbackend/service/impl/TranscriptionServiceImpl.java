package com.procucev.transcriptionbackend.service.impl;

import com.procucev.transcriptionbackend.dto.TranscriptionDto;
import com.procucev.transcriptionbackend.dto.TranscriptionRequest;
import com.procucev.transcriptionbackend.entity.Transcription;
import com.procucev.transcriptionbackend.exception.ResourceNotFoundException;
import com.procucev.transcriptionbackend.repository.TranscriptionRepository;
import com.procucev.transcriptionbackend.service.TranscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Production implementation of the TranscriptionService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptionServiceImpl implements TranscriptionService {

    private final TranscriptionRepository transcriptionRepository;

    @Override
    @Transactional
    public TranscriptionDto createTranscription(TranscriptionRequest request) {
        log.debug("Creating new transcription for language: {}", request.getLanguageCode());

        Transcription transcription = Transcription.builder()
                .originalText(request.getOriginalText().trim())
                .languageCode(request.getLanguageCode().trim())
                .build();

        Transcription saved = transcriptionRepository.save(transcription);
        log.info("Successfully persisted transcription with ID: {}", saved.getId());

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TranscriptionDto> getAllTranscriptions(String languageCode) {
        log.debug("Fetching transcriptions. Language filter: {}", languageCode);

        List<Transcription> records;
        if (languageCode != null && !languageCode.trim().isEmpty()) {
            records = transcriptionRepository.findByLanguageCodeOrderByCreatedAtDesc(languageCode.trim());
        } else {
            records = transcriptionRepository.findAllByOrderByCreatedAtDesc();
        }

        return records.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TranscriptionDto getTranscriptionById(Long id) {
        log.debug("Fetching transcription by ID: {}", id);

        Transcription transcription = transcriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transcription", "id", id));

        return mapToDto(transcription);
    }

    @Override
    @Transactional
    public void deleteTranscription(Long id) {
        log.debug("Deleting transcription with ID: {}", id);

        Transcription transcription = transcriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transcription", "id", id));

        transcriptionRepository.delete(transcription);
        log.info("Successfully deleted transcription with ID: {}", id);
    }

    /**
     * Map a Transcription JPA Entity to a TranscriptionDto.
     */
    private TranscriptionDto mapToDto(Transcription entity) {
        return TranscriptionDto.builder()
                .id(entity.getId())
                .originalText(entity.getOriginalText())
                .languageCode(entity.getLanguageCode())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
