package com.example.scheduler.service.impl;

import com.example.scheduler.config.tenant.TenantContext;
import com.example.scheduler.entity.Clinic;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.exception.ResourceNotFoundException;
import com.example.scheduler.repository.ClinicRepository;
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
