package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.mapper.ClinicSettingsMapperImpl;
import com.example.pulso.mapper.GuestMapperImpl;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class GuestServiceImplClinicTest {
    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldExposeRegionalSettingsOfCurrentClinic() {
        var repository = mock(ClinicRepository.class);
        TenantContext.setCurrentTenant(7L, "demo");
        when(repository.findById(7L))
                .thenReturn(Optional.of(Clinic.builder()
                        .id(7L)
                        .name("Demo")
                        .slug("demo")
                        .country(SupportedCountry.BR)
                        .timezone("America/Manaus")
                        .defaultLanguage(ClinicLanguage.PT_BR)
                        .build()));
        var service = new GuestServiceImpl(
                new CurrentClinicProvider(repository),
                null,
                null,
                null,
                null,
                null,
                new GuestMapperImpl(new ClinicSettingsMapperImpl()));

        var response = service.findCurrentClinic();

        assertThat(response.name()).isEqualTo("Demo");
        assertThat(response.slug()).isEqualTo("demo");
        assertThat(response.country()).isEqualTo("BR");
        assertThat(response.timezone()).isEqualTo("America/Manaus");
        assertThat(response.defaultLanguage()).isEqualTo("pt-BR");
    }
}
