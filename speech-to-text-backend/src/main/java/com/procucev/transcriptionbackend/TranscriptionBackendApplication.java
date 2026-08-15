package com.procucev.transcriptionbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

/**
 * Main entry point for the Enterprise Speech-to-Text Application Backend.
 * Enables AspectJ auto proxying for AOP logging and configures Spring Boot.
 */
@SpringBootApplication
@EnableAspectJAutoProxy
public class TranscriptionBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TranscriptionBackendApplication.class, args);
    }
}
