package com.example.pulso.dto.clinic;

import jakarta.validation.constraints.NotBlank;

public record ClinicRegionalSettingsRequest(
        @NotBlank String country,
        @NotBlank String timezone,
        @NotBlank String defaultLanguage
) {}
