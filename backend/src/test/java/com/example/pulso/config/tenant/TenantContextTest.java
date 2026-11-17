package com.example.pulso.config.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.ZoneId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TenantContextTest {
    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldExposeZoneOfCurrentTenant() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO);

        assertThat(TenantContext.getCurrentZone()).isEqualTo(SAO_PAULO);
        assertThat(TenantContext.getCurrentClinicId()).isEqualTo(7L);
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("clinic_demo");
    }

    @Test
    void shouldKeepZoneWhenRestoringPreviousTenant() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO);
        var previous = TenantContext.current();
        TenantContext.setCurrentTenant(8L, "other", ZoneId.of("America/La_Paz"));

        TenantContext.restore(previous);

        assertThat(TenantContext.current()).isEqualTo(previous);
        assertThat(TenantContext.getCurrentZone()).isEqualTo(SAO_PAULO);
    }

    @Test
    void shouldClearTenantWhenRestoringNull() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO);

        TenantContext.restore(null);

        assertThat(TenantContext.current()).isNull();
    }

    @Test
    void shouldThrowOnZoneWithoutTenant() {
        assertThatThrownBy(TenantContext::getCurrentZone).isInstanceOf(IllegalStateException.class);
    }
}
