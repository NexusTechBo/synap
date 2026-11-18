package com.example.pulso.dto.patient;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PatientRequest(
        @Size(max = 20)
        String document,
        @NotBlank
        @Size(max = 255)
        String name,
        @Email
        @Size(max = 255)
        String email,
        @NotBlank
        @Size(max = 255)
        String phoneNumber
) {}
