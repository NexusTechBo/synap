package com.example.pulso.dto.clinic;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClinicRegionalSettingsRequest(
        @NotBlank @Size(max = 2) String country,
        @NotBlank @Size(max = 64) String timezone,
        @NotBlank @Size(max = 10) String defaultLanguage
) {}
