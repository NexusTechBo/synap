package com.example.pulso.service;

import com.example.pulso.dto.clinic.ActivateClinicRequest;
import com.example.pulso.dto.clinic.ClinicActivatedResponse;
import com.example.pulso.dto.clinic.ResendActivationRequest;
import com.example.pulso.entity.Clinic;

public interface ClinicActivationService {
    void issueActivationToken(Clinic clinic, String adminName, String adminEmail);

    ClinicActivatedResponse activateClinic(ActivateClinicRequest request);

    void resendActivation(ResendActivationRequest request);
}
