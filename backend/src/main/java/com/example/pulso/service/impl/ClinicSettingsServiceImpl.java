package com.example.pulso.service.impl;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.ClinicSettingsMapper;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.service.ClinicSettingsService;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.RegionalSettingsResolver;
import com.example.pulso.websocket.event.SessionRefreshEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClinicSettingsServiceImpl implements ClinicSettingsService {
    private final CurrentClinicProvider currentClinicProvider;
    private final RegionalSettingsResolver regionalSettingsResolver;
    private final ClinicSettingsMapper clinicSettingsMapper;
    private final ClinicRepository clinicRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public ClinicRegionalSettingsResponse getRegionalSettings() {
        return clinicSettingsMapper.toRegionalSettingsResponse(currentClinicProvider.getCurrentClinic());
    }

    @Override
    @Transactional
    public void updateRegionalSettings(ClinicRegionalSettingsRequest request) {
        var settings = regionalSettingsResolver.resolveStrict(
                request.country(),
                request.timezone(),
                request.defaultLanguage()
        );
        var clinicId = TenantContext.getCurrentClinicId();
        var clinic = clinicRepository.findByIdForUpdate(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.CLINIC_NOT_FOUND, clinicId));
        clinic.setCountry(settings.country());
        clinic.setTimezone(settings.timezone());
        clinic.setDefaultLanguage(settings.language());
        clinic.setSettingsVersion(clinic.getSettingsVersion() + 1);
        eventPublisher.publishEvent(new SessionRefreshEvent(clinicId));
    }
}
