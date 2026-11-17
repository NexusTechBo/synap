package com.example.pulso.dto.clinic;

public record ClinicRegionalSettingsUpdateResponse(
        ClinicRegionalSettingsResponse settings,
        String token
) {}
