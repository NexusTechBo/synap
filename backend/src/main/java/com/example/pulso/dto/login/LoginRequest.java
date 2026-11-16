package com.example.pulso.dto.login;

import com.example.pulso.validator.maxUtf8Bytes.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank
        String username,
        @NotBlank
        @MaxUtf8Bytes
        String password
) {}
