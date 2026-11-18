package com.example.pulso.config.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.pulso.enums.SupportedCountry;
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
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO, SupportedCountry.BO);

        assertThat(TenantContext.getCurrentZone()).isEqualTo(SAO_PAULO);
        assertThat(TenantContext.getCurrentClinicId()).isEqualTo(7L);
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("clinic_demo");
    }

    @Test
    void shouldKeepZoneWhenRestoringPreviousTenant() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO, SupportedCountry.BO);
        var previous = TenantContext.current();
        TenantContext.setCurrentTenant(8L, "other", ZoneId.of("America/La_Paz"), SupportedCountry.BO);

        TenantContext.restore(previous);

        assertThat(TenantContext.current()).isEqualTo(previous);
        assertThat(TenantContext.getCurrentZone()).isEqualTo(SAO_PAULO);
    }

    @Test
    void shouldClearTenantWhenRestoringNull() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO, SupportedCountry.BO);

        TenantContext.restore(null);

        assertThat(TenantContext.current()).isNull();
    }

    @Test
    void shouldExposeCountryOfCurrentTenant() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO, SupportedCountry.BR);

        assertThat(TenantContext.getCurrentCountry()).isEqualTo(SupportedCountry.BR);
    }

    @Test
    void shouldKeepCountryWhenRestoringPreviousTenant() {
        TenantContext.setCurrentTenant(7L, "demo", SAO_PAULO, SupportedCountry.BR);
        var previous = TenantContext.current();
        TenantContext.setCurrentTenant(8L, "other", ZoneId.of("America/La_Paz"), SupportedCountry.BO);

        TenantContext.restore(previous);

        assertThat(TenantContext.getCurrentCountry()).isEqualTo(SupportedCountry.BR);
    }

    @Test
    void shouldThrowOnCountryWithoutTenant() {
        assertThatThrownBy(TenantContext::getCurrentCountry).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void shouldThrowOnZoneWithoutTenant() {
        assertThatThrownBy(TenantContext::getCurrentZone).isInstanceOf(IllegalStateException.class);
    }
}
