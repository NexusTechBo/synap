package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.dto.clinic.ActivateClinicRequest;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.ClinicActivationToken;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import com.example.pulso.repository.ClinicActivationTokenRepository;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.ClinicLocaleResolver;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

@ExtendWith(MockitoExtension.class)
class ClinicActivationServiceImplTest {
    private static final Long CLINIC_ID = 7L;
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2030-01-15T10:00:00Z"), ZoneOffset.UTC);

    @Mock
    private ClinicRepository clinicRepository;

    @Mock
    private ClinicActivationTokenRepository tokenRepository;

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    private ClinicActivationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ClinicActivationServiceImpl(
                clinicRepository, tokenRepository, personalRepository, transactionManager, eventPublisher, CLOCK,
                new ClinicLocaleResolver(currentClinicProvider));
    }

    private Clinic clinic(ClinicStatus status, ClinicLanguage language) {
        return Clinic.builder()
                .id(CLINIC_ID)
                .name("Norte")
                .slug("norte")
                .status(status)
                .country(SupportedCountry.BO)
                .timezone("America/La_Paz")
                .defaultLanguage(language)
                .build();
    }

    @Nested
    class IssueActivationToken {
        @Test
        void shouldPublishActivationEventWithEnglishLocaleWhenClinicLanguageIsEnglish() {
            service.issueActivationToken(clinic(ClinicStatus.PENDING_ACTIVATION, ClinicLanguage.EN), "Ana", "ana@example.com");

            var captor = ArgumentCaptor.forClass(ClinicActivationEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().locale()).isEqualTo(Locale.ENGLISH);
            assertThat(captor.getValue().adminEmail()).isEqualTo("ana@example.com");
        }

        @Test
        void shouldPublishActivationEventWithSpanishLocaleWhenClinicLanguageIsPortuguese() {
            service.issueActivationToken(clinic(ClinicStatus.PENDING_ACTIVATION, ClinicLanguage.PT_BR), "Ana", "ana@example.com");

            var captor = ArgumentCaptor.forClass(ClinicActivationEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().locale()).isEqualTo(Locale.forLanguageTag("es"));
        }
    }

    @Nested
    class ActivateClinic {
        private void givenPendingClinicWithValidToken(ClinicLanguage language) {
            var clinic = clinic(ClinicStatus.PENDING_ACTIVATION, language);
            var token = ClinicActivationToken.builder()
                    .clinic(clinic)
                    .email("ana@example.com")
                    .expiresAt(LocalDateTime.now(CLOCK).plusHours(1))
                    .createdAt(LocalDateTime.now(CLOCK))
                    .build();
            when(tokenRepository.findClinicIdByTokenHash(anyString())).thenReturn(Optional.of(CLINIC_ID));
            lenient().when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(clinicRepository.findByIdForUpdate(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(tokenRepository.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(token));
            when(personalRepository.findFirstByRoleOrderByIdAsc(ERole.ADMINISTRATOR))
                    .thenReturn(Optional.of(Personal.builder().name("Ana").username("ana").build()));
        }

        @Test
        void shouldPublishWelcomeEventWithEnglishLocaleWhenClinicLanguageIsEnglish() {
            givenPendingClinicWithValidToken(ClinicLanguage.EN);

            service.activateClinic(new ActivateClinicRequest("raw-token"));

            var captor = ArgumentCaptor.forClass(ClinicActivatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().locale()).isEqualTo(Locale.ENGLISH);
            assertThat(captor.getValue().adminUsername()).isEqualTo("ana");
        }

        @Test
        void shouldPublishWelcomeEventWithSpanishLocaleWhenClinicLanguageIsPortuguese() {
            givenPendingClinicWithValidToken(ClinicLanguage.PT_BR);

            service.activateClinic(new ActivateClinicRequest("raw-token"));

            var captor = ArgumentCaptor.forClass(ClinicActivatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().locale()).isEqualTo(Locale.forLanguageTag("es"));
        }

        @Test
        void shouldPublishWelcomeEventWithSpanishLocaleWhenClinicLanguageIsSpanish() {
            givenPendingClinicWithValidToken(ClinicLanguage.ES);

            service.activateClinic(new ActivateClinicRequest("raw-token"));

            var captor = ArgumentCaptor.forClass(ClinicActivatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().locale()).isEqualTo(Locale.forLanguageTag("es"));
        }
    }
}
