package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.clinic.ClinicRequest;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.entity.Specialty;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.repository.ClinicActivationTokenRepository;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.repository.SpecialtyRepository;
import com.example.pulso.service.ClinicActivationService;
import com.example.pulso.service.SchemaProvisioningService;
import com.example.pulso.service.component.document.BolivianCiValidator;
import com.example.pulso.service.component.document.BrazilianCpfValidator;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.ClinicLocaleResolver;
import com.example.pulso.service.component.resolver.IdentityDocumentResolver;
import com.example.pulso.service.component.resolver.RegionalSettingsResolver;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
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
    private SpecialtyRepository specialtyRepository;

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

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    @BeforeEach
    void initLocale() {
        LocaleContextHolder.setDefaultLocale(LocaleConfig.SPANISH);
    }

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
        LocaleContextHolder.setDefaultLocale(null);
    }

    private static MessageSource messageSource() {
        var source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding(StandardCharsets.UTF_8.name());
        source.setFallbackToSystemLocale(false);
        return source;
    }

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
                new RegionalSettingsResolver(),
                specialtyRepository,
                messageSource(),
                new IdentityDocumentResolver(List.of(new BolivianCiValidator(), new BrazilianCpfValidator())),
                new ClinicLocaleResolver(currentClinicProvider));
    }

    private static ClinicRequest request(String country, String timezone, String language) {
        return request(country, timezone, language, "70000000", "12345");
    }

    private static ClinicRequest brazilRequest(String timezone, String language, String adminDocument) {
        return request("BR", timezone, language, "11 91234-5678", adminDocument);
    }

    private static ClinicRequest request(
            String country, String timezone, String language, String phoneNumber, String adminDocument) {
        return new ClinicRequest("Clinica Demo", "demo", phoneNumber, "Admin Demo", "admin",
                "admin@mail.test", "secret123", adminDocument, country, timezone, language);
    }

    private Personal savedAdmin() {
        var captor = ArgumentCaptor.forClass(Personal.class);
        verify(personalRepository).save(captor.capture());
        return captor.getValue();
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

    private Specialty savedSpecialty() {
        var captor = ArgumentCaptor.forClass(Specialty.class);
        verify(specialtyRepository).save(captor.capture());
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

        service().createClinic(request("br", "America/Manaus", "en", "11 91234-5678", "52998224725"));

        var clinic = savedClinic();
        assertThat(clinic.getCountry()).isEqualTo(SupportedCountry.BR);
        assertThat(clinic.getTimezone()).isEqualTo("America/Manaus");
        assertThat(clinic.getDefaultLanguage()).isEqualTo(ClinicLanguage.EN);
    }

    @Test
    void shouldUseBrazilDefaultsWhenOnlyCountryIsProvided() {
        stubHappyPath();

        service().createClinic(brazilRequest(null, null, "52998224725"));

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
        verifyNoInteractions(schemaProvisioningService, personalRepository, specialtyRepository, clinicActivationService);
    }

    @Test
    void shouldNormalizeClinicPhoneAndAdminDocumentWithRequestCountry() {
        stubHappyPath();

        service().createClinic(brazilRequest(null, null, "529.982.247-25"));

        assertThat(savedClinic().getPhoneNumber()).isEqualTo("+5511912345678");
        assertThat(savedAdmin().getDocument()).isEqualTo("52998224725");
    }

    @Test
    void shouldNormalizeBolivianPhoneByDefault() {
        stubHappyPath();

        service().createClinic(request(null, null, null));

        assertThat(savedClinic().getPhoneNumber()).isEqualTo("+59170000000");
        assertThat(savedAdmin().getDocument()).isEqualTo("12345");
    }

    @Test
    void shouldRejectInvalidCpfBeforeCreatingAnything() {
        var thrown = catchThrowable(() -> service().createClinic(brazilRequest(null, null, "52998224724")));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        verifyNoInteractions(clinicRepository, schemaProvisioningService, personalRepository, specialtyRepository, clinicActivationService);
    }

    @Test
    void shouldRejectBolivianCiWhenCountryIsBrazil() {
        var thrown = catchThrowable(() -> service().createClinic(brazilRequest(null, null, "12345")));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        verifyNoInteractions(schemaProvisioningService);
    }

    @Test
    void shouldRejectInvalidCiBeforeCreatingAnythingWhenCountryIsBolivia() {
        var thrown = catchThrowable(() -> service().createClinic(request("BO", null, null, "70000000", "1234")));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID);
        verifyNoInteractions(schemaProvisioningService);
    }

    @Test
    void shouldCreateDefaultSpecialtyInSpanishWhenClinicLanguageIsEs() {
        stubHappyPath();

        service().createClinic(request(null, null, "es"));

        assertThat(savedSpecialty().getName()).isEqualTo("Medicina general");
    }

    @Test
    void shouldCreateDefaultSpecialtyInEnglishWhenClinicLanguageIsEn() {
        stubHappyPath();

        service().createClinic(request(null, null, "en"));

        assertThat(savedSpecialty().getName()).isEqualTo("General medicine");
    }

    @Test
    void shouldCreateDefaultSpecialtyInSpanishWhenClinicLanguageIsPtBr() {
        stubHappyPath();

        service().createClinic(request(null, null, "pt-BR"));

        assertThat(savedSpecialty().getName()).isEqualTo("Medicina general");
    }

    @Test
    void shouldIgnoreRequestLocaleWhenCreatingDefaultSpecialty() {
        stubHappyPath();
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        service().createClinic(request(null, null, "es"));

        assertThat(savedSpecialty().getName()).isEqualTo("Medicina general");
    }

    @Test
    void shouldCreateDefaultSpecialtyInSpanishWhenClinicLanguageIsOmitted() {
        stubHappyPath();

        service().createClinic(request(null, null, null));

        assertThat(savedSpecialty().getName()).isEqualTo("Medicina general");
    }

    @Test
    void shouldRollbackClinicAndDropSchemaWhenDefaultSpecialtySaveFails() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(clinicRepository.findPendingIdsByNameOrSlug(any(), any())).thenReturn(List.of());
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(clinicRepository.saveAndFlush(any())).thenAnswer(i -> {
            Clinic c = i.getArgument(0);
            c.setId(7L);
            return c;
        });
        when(specialtyRepository.save(any())).thenThrow(new RuntimeException("DB error"));

        var thrown = catchThrowable(() -> service().createClinic(request(null, null, null)));

        assertThat(thrown).isInstanceOf(RuntimeException.class);
        verify(clinicRepository).delete(any(Clinic.class));
        verify(schemaProvisioningService).dropTenantSchema(TenantContext.schemaName("demo"));
        verifyNoInteractions(clinicActivationService);
    }
}