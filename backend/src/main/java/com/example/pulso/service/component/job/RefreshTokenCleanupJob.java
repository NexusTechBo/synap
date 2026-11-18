package com.example.pulso.service.component.job;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupJob implements SchedulingConfigurer {
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenProperties properties;

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addCronTask(this::deleteExpired, properties.cleanupCron());
    }

    void deleteExpired() {
        var deleted = refreshTokenService.deleteExpired();
        log.info("Expired refresh tokens deleted: {}", deleted);
    }
}
