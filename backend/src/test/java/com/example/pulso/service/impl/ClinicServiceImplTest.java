package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.dto.clinic.ClinicRequest;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.repository.ClinicActivationTokenRepository;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.service.ClinicActivationService;
import com.example.pulso.service.component.resolver.RegionalSettingsResolver;
import com.example.pulso.service.SchemaProvisioningService;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

@ExtendWith(MockitoExtension.class)
class ClinicServiceImplTest {
    @Mock
    private ClinicRepository clinicRepository;

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SchemaProvisioningService schemaProvisioningService;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private ClinicActivationService clinicActivationService;

    @Mock
    private ClinicActivationTokenRepository tokenRepository;

    private ClinicServiceImpl service() {
        return new ClinicServiceImpl(
                clinicRepository,
                personalRepository,
                passwordEncoder,
                schemaProvisioningService,
                transactionManager,
                clinicActivationService,
                tokenRepository,
                Clock.systemUTC(),
                new RegionalSettingsResolver());
    }

    private static ClinicRequest request(String country, String timezone, String language) {
        return new ClinicRequest("Clinica Demo", "demo", "70000000", "Admin Demo", "admin",
                "admin@mail.test", "secret123", "12345", country, timezone, language);
    }

    private void stubHappyPath() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(clinicRepository.findPendingIdsByNameOrSlug(any(), any())).thenReturn(List.of());
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(clinicRepository.saveAndFlush(any())).thenAnswer(i -> {
            Clinic c = i.getArgument(0);
            c.setId(7L);
            return c;
        });
        when(personalRepository.save(any())).thenAnswer(i -> {
            Personal p = i.getArgument(0);
            p.setId(1L);
            return p;
        });
    }

    private Clinic savedClinic() {
        var captor = ArgumentCaptor.forClass(Clinic.class);
        verify(clinicRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    @Test
    void shouldPersistDefaultsWhenRegionalValuesAreOmitted() {
        stubHappyPath();

        service().createClinic(request(null, null, null));

        var clinic = savedClinic();
        assertThat(clinic.getCountry()).isEqualTo(SupportedCountry.BO);
        assertThat(clinic.getTimezone()).isEqualTo("America/La_Paz");
        assertThat(clinic.getDefaultLanguage()).isEqualTo(ClinicLanguage.ES);
    }

    @Test
    void shouldPersistProvidedRegionalValues() {
        stubHappyPath();

        service().createClinic(request("br", "America/Manaus", "en"));

        var clinic = savedClinic();
        assertThat(clinic.getCountry()).isEqualTo(SupportedCountry.BR);
        assertThat(clinic.getTimezone()).isEqualTo("America/Manaus");
        assertThat(clinic.getDefaultLanguage()).isEqualTo(ClinicLanguage.EN);
    }

    @Test
    void shouldUseBrazilDefaultsWhenOnlyCountryIsProvided() {
        stubHappyPath();

        service().createClinic(request("BR", null, null));

        var clinic = savedClinic();
        assertThat(clinic.getTimezone()).isEqualTo("America/Sao_Paulo");
        assertThat(clinic.getDefaultLanguage()).isEqualTo(ClinicLanguage.PT_BR);
    }

    @Test
    void shouldNotSaveAnythingWhenRegionalValuesAreInvalid() {
        var thrown = catchThrowable(() -> service().createClinic(request("BR", "America/La_Paz", null)));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
        verify(clinicRepository, never()).saveAndFlush(any());
        verifyNoInteractions(schemaProvisioningService, personalRepository, clinicActivationService);
    }
}
