package com.example.pulso.service.component.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.service.RefreshTokenService;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCleanupJobTest {
    @Mock
    private RefreshTokenService refreshTokenService;

    private RefreshTokenCleanupJob job() {
        return new RefreshTokenCleanupJob(
                refreshTokenService,
                new RefreshTokenProperties(Duration.ofDays(7), Duration.ofDays(30), "refresh_token", true, "0 0 3 * * *"));
    }

    @Test
    void shouldRegisterCronTaskWithConfiguredExpression() {
        var registrar = new ScheduledTaskRegistrar();

        job().configureTasks(registrar);

        assertThat(registrar.getCronTaskList()).extracting(CronTask::getExpression).containsExactly("0 0 3 * * *");
    }

    @Test
    void shouldDeleteExpiredTokens() {
        job().deleteExpired();

        verify(refreshTokenService).deleteExpired();
    }
}
