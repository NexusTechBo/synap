package com.example.pulso.service.impl;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.entity.Clinic;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.repository.ClinicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentClinicProvider {
    private final ClinicRepository clinicRepository;

    Clinic getCurrentClinic() {
        var clinicId = TenantContext.getCurrentClinicId();
        return clinicRepository
                .findById(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.CLINIC_NOT_FOUND, clinicId));
    }
}
