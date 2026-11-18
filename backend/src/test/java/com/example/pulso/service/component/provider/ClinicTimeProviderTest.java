package com.example.pulso.service.component.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.SupportedCountry;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class ClinicTimeProviderTest {
    private static final Instant NOON_UTC = Instant.parse("2026-11-17T14:00:00Z");
    private static final Instant NEAR_MIDNIGHT_UTC = Instant.parse("2026-11-18T03:30:00Z");

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ClinicTimeProvider providerAt(Instant instant) {
        return new ClinicTimeProvider(Clock.fixed(instant, ZoneOffset.UTC));
    }

    private static void bindZone(String zone) {
        TenantContext.setCurrentTenant(1L, "demo", ZoneId.of(zone), SupportedCountry.BO);
    }

    @Test
    void shouldReturnSaoPauloLocalTime() {
        bindZone("America/Sao_Paulo");

        assertThat(providerAt(NOON_UTC).now()).isEqualTo(LocalDateTime.of(2026, 11, 17, 11, 0));
    }

    @Test
    void shouldReturnLaPazLocalTime() {
        bindZone("America/La_Paz");

        assertThat(providerAt(NOON_UTC).now()).isEqualTo(LocalDateTime.of(2026, 11, 17, 10, 0));
    }

    @Test
    void shouldReturnDifferentTodayAcrossZonesNearMidnight() {
        var provider = providerAt(NEAR_MIDNIGHT_UTC);

        bindZone("America/Sao_Paulo");
        var saoPauloToday = provider.today();
        bindZone("America/La_Paz");
        var laPazToday = provider.today();

        assertThat(saoPauloToday).isEqualTo(LocalDate.of(2026, 11, 18));
        assertThat(laPazToday).isEqualTo(LocalDate.of(2026, 11, 17));
    }

    @Test
    void shouldFollowTenantChangesBetweenCalls() {
        var provider = providerAt(NOON_UTC);

        bindZone("America/Sao_Paulo");
        var first = provider.now();
        bindZone("America/La_Paz");
        var second = provider.now();

        assertThat(first).isEqualTo(second.plusHours(1));
    }

    @Test
    void shouldThrowOnNowWithoutTenant() {
        assertThatThrownBy(() -> providerAt(NOON_UTC).now()).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void shouldThrowOnTodayWithoutTenant() {
        assertThatThrownBy(() -> providerAt(NOON_UTC).today()).isInstanceOf(IllegalStateException.class);
    }
}
