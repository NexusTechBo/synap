package com.example.pulso.service;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;

public interface ClinicSettingsService {
    ClinicRegionalSettingsResponse getRegionalSettings();

    void updateRegionalSettings(ClinicRegionalSettingsRequest request);
}
