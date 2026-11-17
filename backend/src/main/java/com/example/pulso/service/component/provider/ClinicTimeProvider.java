package com.example.pulso.service.component.provider;

import com.example.pulso.config.tenant.TenantContext;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClinicTimeProvider {
    private final Clock clock;

    public LocalDateTime now() {
        return LocalDateTime.now(clock.withZone(TenantContext.getCurrentZone()));
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(TenantContext.getCurrentZone()));
    }
}
