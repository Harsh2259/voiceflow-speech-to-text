package com.procucev.transcriptionbackend.repository;

import com.procucev.transcriptionbackend.entity.Transcription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Transcription entity CRUD and query operations.
 */
@Repository
public interface TranscriptionRepository extends JpaRepository<Transcription, Long> {

    /**
     * Retrieve all transcriptions ordered by creation time descending (newest first).
     */
    List<Transcription> findAllByOrderByCreatedAtDesc();

    /**
     * Retrieve transcriptions filtered by language code, ordered newest first.
     */
    List<Transcription> findByLanguageCodeOrderByCreatedAtDesc(String languageCode);
}
