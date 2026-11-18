package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.lenient;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.mapper.ClinicLanguageMapperImpl;
import com.example.pulso.mapper.ClinicSettingsMapperImpl;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.RegionalSettingsResolver;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClinicSettingsServiceImplTest {
    @Mock
    private ClinicRepository clinicRepository;

    private ClinicSettingsServiceImpl service;
    private Clinic clinic;

    @BeforeEach
    void setUp() {
        service = new ClinicSettingsServiceImpl(
                new CurrentClinicProvider(clinicRepository),
                new RegionalSettingsResolver(),
                new ClinicSettingsMapperImpl(new ClinicLanguageMapperImpl()));
        TenantContext.setCurrentTenant(7L, "demo", ZoneOffset.UTC, SupportedCountry.BO);
        clinic = Clinic.builder()
                .id(7L)
                .name("Demo")
                .slug("demo")
                .phoneNumber("1")
                .country(SupportedCountry.BO)
                .timezone("America/La_Paz")
                .defaultLanguage(ClinicLanguage.ES)
                .build();
        lenient().when(clinicRepository.findById(7L)).thenReturn(Optional.of(clinic));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldReturnCurrentClinicSettings() {
        var response = service.getRegionalSettings();

        assertThat(response.country()).isEqualTo("BO");
        assertThat(response.timezone()).isEqualTo("America/La_Paz");
        assertThat(response.defaultLanguage()).isEqualTo("es");
    }

    @Test
    void shouldUpdateCurrentClinicSettings() {
        service.updateRegionalSettings(new ClinicRegionalSettingsRequest("BR", "America/Manaus", "pt-BR"));

        assertThat(clinic.getCountry()).isEqualTo(SupportedCountry.BR);
        assertThat(clinic.getTimezone()).isEqualTo("America/Manaus");
        assertThat(clinic.getDefaultLanguage()).isEqualTo(ClinicLanguage.PT_BR);
    }

    @Test
    void shouldNotModifyClinicWhenSettingsAreInvalid() {
        var thrown = catchThrowable(() -> service.updateRegionalSettings(
                new ClinicRegionalSettingsRequest("BR", "America/La_Paz", "pt-BR")));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
        assertThat(clinic.getCountry()).isEqualTo(SupportedCountry.BO);
        assertThat(clinic.getTimezone()).isEqualTo("America/La_Paz");
    }
}
