package com.procucev.transcriptionbackend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for returning transcription data in REST APIs.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranscriptionDto {
    private Long id;
    private String originalText;
    private String languageCode;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
