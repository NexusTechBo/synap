package com.example.pulso.dto.guest;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GuestNewPatientRequest(
        @Size(max = 20)
        String document,
        @NotBlank
        @Size(max = 255)
        String name,
        @NotBlank
        @Size(max = 255)
        String phoneNumber,
        @Email
        @Size(max = 255)
        String email
) {}
