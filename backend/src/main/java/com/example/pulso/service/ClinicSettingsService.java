package com.example.pulso.service;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;

public interface ClinicSettingsService {
    ClinicRegionalSettingsResponse getRegionalSettings();

    ClinicRegionalSettingsResponse updateRegionalSettings(ClinicRegionalSettingsRequest request);
}
