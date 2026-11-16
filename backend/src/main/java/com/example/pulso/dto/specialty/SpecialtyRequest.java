package com.example.pulso.dto.specialty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecialtyRequest(
        @NotBlank
        @Size(max = 255)
        String name
) {}
