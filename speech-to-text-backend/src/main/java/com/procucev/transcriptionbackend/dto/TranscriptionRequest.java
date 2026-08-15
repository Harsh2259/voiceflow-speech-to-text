package com.procucev.transcriptionbackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload DTO for creating a new saved transcription record.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranscriptionRequest {

    @NotBlank(message = "Original text must not be blank")
    private String originalText;

    @NotBlank(message = "Language code must not be blank")
    @Pattern(regexp = "^[a-zA-Z]{2}(-[a-zA-Z0-9]+)?$", message = "Language code must follow ISO format like 'en', 'en-US', 'es-ES'")
    private String languageCode;
}
