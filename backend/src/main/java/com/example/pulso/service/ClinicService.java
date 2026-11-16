package com.example.pulso.service;

import com.example.pulso.dto.clinic.ClinicCreatedResponse;
import com.example.pulso.dto.clinic.ClinicRequest;

public interface ClinicService {
    ClinicCreatedResponse createClinic(ClinicRequest request);
}
