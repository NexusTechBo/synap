package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.personal.DoctorModeRequest;
import com.example.pulso.dto.personal.PersonalProfileUpdateRequest;
import com.example.pulso.dto.personal.PersonalRequest;
import com.example.pulso.dto.personal.PersonalUpdateRequest;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.entity.Specialty;
import com.example.pulso.enums.AppointmentStatus;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.ForbiddenException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.notification.event.StaffCreatedEvent;
import com.example.pulso.repository.AppointmentRepository;
import com.example.pulso.repository.DoctorAvailabilityRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.repository.SpecialtyRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.RefreshTokenService;
import com.example.pulso.service.component.document.BolivianCiValidator;
import com.example.pulso.service.component.document.BrazilianCpfValidator;
import com.example.pulso.service.component.provider.ClinicTimeProvider;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.ClinicLocaleResolver;
import com.example.pulso.service.component.resolver.IdentityDocumentResolver;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PersonalServiceImplTest {
    private static final Long ADMIN_ID = 1L;
    private static final Long SPECIALTY_ID = 5L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 4, 10, 0);
    private static final Clock CLOCK = Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private static final List<AppointmentStatus> ACTIVE =
            List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private SpecialtyRepository specialtyRepository;

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    @Mock
    private PersonalMapper personalMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AppointmentService appointmentService;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorAvailabilityRepository doctorAvailabilityRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private RefreshTokenService refreshTokenService;

    private PersonalServiceImpl service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(1L, "demo", ZoneOffset.UTC, SupportedCountry.BO);
        service = new PersonalServiceImpl(
                personalRepository,
                specialtyRepository,
                currentClinicProvider,
                personalMapper,
                passwordEncoder,
                appointmentService,
                appointmentRepository,
                doctorAvailabilityRepository,
                eventPublisher,
                new ClinicTimeProvider(CLOCK),
                new IdentityDocumentResolver(List.of(new BolivianCiValidator(), new BrazilianCpfValidator())),
                new ClinicLocaleResolver(currentClinicProvider),
                refreshTokenService
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Personal admin(boolean alsoDoctor) {
        return Personal.builder()
                .id(ADMIN_ID)
                .name("Admin")
                .email("admin@mail.test")
                .role(ERole.ADMINISTRATOR)
                .alsoDoctor(alsoDoctor)
                .specialty(
                        alsoDoctor
                                ? Specialty.builder()
                                        .id(SPECIALTY_ID)
                                        .name("Cardio")
                                        .build()
                                : null
                )
                .build();
    }

    private void givenPersonal(Personal personal) {
        when(personalRepository.findByIdForUpdate(personal.getId())).thenReturn(Optional.of(personal));
    }

    private void givenActiveAppointments(long count) {
        when(appointmentRepository.countByDoctorIdAndStatusInAndStartTimeAfter(ADMIN_ID, ACTIVE, NOW))
                .thenReturn(count);
    }

    @Nested
    class CreatePersonal {
        private PersonalRequest request(String ci) {
            return new PersonalRequest(
                    "Asistente", "asist@mail.test", null, ci, "asist", "secret123", ERole.ASSISTANT, null);
        }

        private void givenClinic() {
            when(currentClinicProvider.getCurrentClinic())
                    .thenReturn(Clinic.builder().name("Demo").slug("demo").defaultLanguage(ClinicLanguage.ES).build());
        }

        private Personal savedPersonal() {
            var captor = ArgumentCaptor.forClass(Personal.class);
            verify(personalRepository).save(captor.capture());
            return captor.getValue();
        }

        private StaffCreatedEvent createWithClinicLanguage(ClinicLanguage language) {
            when(currentClinicProvider.getCurrentClinic())
                    .thenReturn(Clinic.builder().name("Demo").slug("demo").defaultLanguage(language).build());
            when(personalRepository.save(any(Personal.class))).thenAnswer(inv -> inv.getArgument(0));

            service.createPersonal(request(null));

            var captor = ArgumentCaptor.forClass(StaffCreatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            return captor.getValue();
        }

        @Test
        void shouldPublishStaffCreatedEventWithEnglishLocaleWhenClinicLanguageIsEnglish() {
            assertThat(createWithClinicLanguage(ClinicLanguage.EN).locale()).isEqualTo(Locale.ENGLISH);
        }

        @Test
        void shouldPublishStaffCreatedEventWithSpanishLocaleWhenClinicLanguageIsPortuguese() {
            assertThat(createWithClinicLanguage(ClinicLanguage.PT_BR).locale())
                    .isEqualTo(Locale.forLanguageTag("es"));
        }

        @Test
        void shouldIgnoreRequestLocaleWhenPublishingStaffCreatedEvent() {
            LocaleContextHolder.setLocale(Locale.ENGLISH);

            try {
                assertThat(createWithClinicLanguage(ClinicLanguage.ES).locale())
                        .isEqualTo(Locale.forLanguageTag("es"));
            } finally {
                LocaleContextHolder.resetLocaleContext();
            }
        }

        @Test
        void shouldSaveNullCiAndSkipCiLookupWhenCiIsNull() {
            givenClinic();
            when(personalRepository.save(any(Personal.class))).thenAnswer(inv -> inv.getArgument(0));

            service.createPersonal(request(null));

            verify(personalRepository, never()).existsByDocument(any());
            assertThat(savedPersonal().getDocument()).isNull();
        }

        @Test
        void shouldSaveNullCiWhenCiIsBlank() {
            givenClinic();
            when(personalRepository.save(any(Personal.class))).thenAnswer(inv -> inv.getArgument(0));

            service.createPersonal(request("   "));

            verify(personalRepository, never()).existsByDocument(any());
            assertThat(savedPersonal().getDocument()).isNull();
        }

        @Test
        void shouldSaveCiWhenCiIsNew() {
            givenClinic();
            when(personalRepository.existsByDocument("123456")).thenReturn(false);
            when(personalRepository.save(any(Personal.class))).thenAnswer(inv -> inv.getArgument(0));

            service.createPersonal(request("123456"));

            assertThat(savedPersonal().getDocument()).isEqualTo("123456");
        }

        @Test
        void shouldThrowAlreadyExistsWhenCiIsDuplicated() {
            givenClinic();
            when(personalRepository.existsByDocument("123456")).thenReturn(true);

            var thrown = catchThrowable(() -> service.createPersonal(request("123456")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PERSONAL_ALREADY_EXISTS);
            verify(personalRepository, never()).save(any());
        }
    }

    @Nested
    class DisableDoctorMode {
        @Test
        void shouldDisableWithoutTouchingAvailabilitiesWhenNoActiveAppointments() {
            var personal = admin(true);
            givenPersonal(personal);
            givenActiveAppointments(0);
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, null, null));

            assertThat(personal.isAlsoDoctor()).isFalse();
            assertThat(personal.getSpecialty()).isNull();
            verifyNoInteractions(doctorAvailabilityRepository, appointmentService);
        }

        @Test
        void shouldThrowConflictWithCountAndSaveNothingWhenActiveAppointmentsAndNotConfirmed() {
            var personal = admin(true);
            givenPersonal(personal);
            givenActiveAppointments(3);

            var thrown = catchThrowable(
                    () -> service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, false, "motivo"))
            );

            assertThat(thrown).isInstanceOf(BusinessException.class);
            var ex = (BusinessException) thrown;
            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.PERSONAL_DOCTOR_MODE_ACTIVE_APPOINTMENTS_CONFLICT);
            assertThat(ex.getDetails()).isEqualTo(Map.of("count", 3L));
            assertThat(personal.isAlsoDoctor()).isTrue();
            verify(personalRepository, never()).saveAndFlush(any());
            verifyNoInteractions(appointmentService, doctorAvailabilityRepository);
        }

        @Test
        void shouldThrowConflictWhenConfirmationIsNull() {
            givenPersonal(admin(true));
            givenActiveAppointments(1);

            var thrown = catchThrowable(
                    () -> service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, null, null))
            );

            assertThat(thrown).isInstanceOf(BusinessException.class);
            verifyNoInteractions(appointmentService);
        }

        @Test
        void shouldCancelWithReasonThenDisableWhenConfirmed() {
            var personal = admin(true);
            givenPersonal(personal);
            givenActiveAppointments(2);
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, true, "Vacaciones"));

            var order = inOrder(appointmentService, personalRepository);
            order.verify(appointmentService).cancelUpcomingAppointmentsOfDoctor(ADMIN_ID, "Vacaciones");
            order.verify(personalRepository).saveAndFlush(personal);
            assertThat(personal.isAlsoDoctor()).isFalse();
            assertThat(personal.getSpecialty()).isNull();
            verifyNoInteractions(doctorAvailabilityRepository);
        }

        @Test
        void shouldPassBlankReasonThroughWhenConfirmed() {
            var personal = admin(true);
            givenPersonal(personal);
            givenActiveAppointments(2);
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, true, "  "));

            verify(appointmentService).cancelUpcomingAppointmentsOfDoctor(ADMIN_ID, "  ");
            assertThat(personal.isAlsoDoctor()).isFalse();
        }

        @Test
        void shouldPassNullReasonThroughWhenConfirmed() {
            var personal = admin(true);
            givenPersonal(personal);
            givenActiveAppointments(2);
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, true, null));

            verify(appointmentService).cancelUpcomingAppointmentsOfDoctor(ADMIN_ID, null);
            assertThat(personal.isAlsoDoctor()).isFalse();
        }

        @Test
        void shouldThrowForbiddenWhenNotAdministrator() {
            var doctor = Personal.builder().id(ADMIN_ID).role(ERole.DOCTOR).build();
            givenPersonal(doctor);

            var thrown = catchThrowable(
                    () -> service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(false, null, true, null))
            );

            assertThat(thrown).isInstanceOf(ForbiddenException.class);
            verifyNoInteractions(appointmentService, appointmentRepository);
        }
    }

    @Nested
    class EnableDoctorMode {
        @Test
        void shouldEnableWithSpecialtyWithoutCountingAppointments() {
            var personal = admin(false);
            var specialty = Specialty.builder().id(SPECIALTY_ID).name("Cardio").build();
            givenPersonal(personal);
            when(specialtyRepository.findById(SPECIALTY_ID)).thenReturn(Optional.of(specialty));
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(true, SPECIALTY_ID, null, null));

            assertThat(personal.isAlsoDoctor()).isTrue();
            assertThat(personal.getSpecialty()).isSameAs(specialty);
            verifyNoInteractions(appointmentRepository, appointmentService, doctorAvailabilityRepository);
        }
    }

    @Nested
    class UpdatePersonalByAdmin {
        @Test
        void shouldStillRejectDoctorToAssistantWithActiveAvailabilities() {
            var doctor = Personal.builder().id(9L).role(ERole.DOCTOR).build();
            when(personalRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(doctor));
            when(appointmentRepository.existsByDoctorIdAndStatusNotAndStartTimeAfter(
                    9L,
                    AppointmentStatus.CANCELLED,
                    NOW
            )).thenReturn(false);
            when(doctorAvailabilityRepository.existsByDoctorIdAndActiveTrue(9L)).thenReturn(true);
            var request = new PersonalUpdateRequest("Dr", "dr@mail.test", null, null, ERole.ASSISTANT, null);

            var thrown = catchThrowable(() -> service.updatePersonalByAdmin(9L, request));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((BusinessException) thrown).getMessageKey())
                    .isEqualTo(MessageKeys.PERSONAL_DOCTOR_HAS_ACTIVE_AVAILABILITIES);
            verify(personalRepository, never()).save(any());
        }
    }

    @Nested
    class CreatePersonalInBrazilianTenant {
        @BeforeEach
        void bindBrazil() {
            TenantContext.setCurrentTenant(1L, "demo", ZoneOffset.UTC, SupportedCountry.BR);
        }

        private PersonalRequest request(String document, String phone) {
            return new PersonalRequest(
                    "Asistente", "asist@mail.test", phone, document, "asist", "secret123", ERole.ASSISTANT, null);
        }

        private void givenClinic() {
            when(currentClinicProvider.getCurrentClinic())
                    .thenReturn(Clinic.builder().name("Demo").slug("demo").defaultLanguage(ClinicLanguage.ES).build());
        }

        @Test
        void shouldSaveDigitsOnlyDocumentAndE164PhoneWhenCpfIsValid() {
            givenClinic();
            when(personalRepository.save(any(Personal.class))).thenAnswer(inv -> inv.getArgument(0));

            service.createPersonal(request("529.982.247-25", "11 91234-5678"));

            var captor = ArgumentCaptor.forClass(Personal.class);
            verify(personalRepository).save(captor.capture());
            assertThat(captor.getValue().getDocument()).isEqualTo("52998224725");
            assertThat(captor.getValue().getPhoneNumber()).isEqualTo("+5511912345678");
            verify(personalRepository).existsByDocument("52998224725");
        }

        @Test
        void shouldThrowCpfInvalidWhenCheckDigitIsWrong() {
            givenClinic();

            var thrown = catchThrowable(() -> service.createPersonal(request("52998224724", null)));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
            verify(personalRepository, never()).save(any());
        }

        @Test
        void shouldThrowCpfInvalidWhenBolivianCiIsSent() {
            givenClinic();

            var thrown = catchThrowable(() -> service.createPersonal(request("1234567", null)));

            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        }
    }

    @Nested
    class SessionRevocation {
        private static final Long CLINIC_ID = 1L;
        private static final Long TARGET_ID = 9L;

        private Personal target(ERole role) {
            var personal = Personal.builder()
                    .id(TARGET_ID)
                    .name("Target")
                    .email("target@mail.test")
                    .password("old-hash")
                    .role(role)
                    .active(true)
                    .build();
            givenPersonal(personal);
            return personal;
        }

        @Test
        void shouldRevokeAllFamiliesWhenDeactivatingUser() {
            target(ERole.ASSISTANT);

            service.deactivatePersonalById(TARGET_ID, ADMIN_ID);

            verify(refreshTokenService).revokeAllForUser(CLINIC_ID, TARGET_ID);
        }

        @Test
        void shouldNotRevokeWhenDeactivatingSelfIsRejected() {
            var thrown = catchThrowable(() -> service.deactivatePersonalById(ADMIN_ID, ADMIN_ID));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            verifyNoInteractions(refreshTokenService);
        }

        @Test
        void shouldRevokeAllFamiliesWhenAdminResetsPassword() {
            target(ERole.ASSISTANT);
            when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

            service.updatePersonalByAdmin(
                    TARGET_ID, new PersonalUpdateRequest("Target", "target@mail.test", null, "new-password", ERole.ASSISTANT, null));

            verify(refreshTokenService).revokeAllForUser(CLINIC_ID, TARGET_ID);
        }

        @Test
        void shouldRevokeAllFamiliesWhenAdminChangesRole() {
            var personal = target(ERole.ASSISTANT);
            when(specialtyRepository.findById(SPECIALTY_ID))
                    .thenReturn(Optional.of(Specialty.builder().id(SPECIALTY_ID).name("Cardio").build()));

            service.updatePersonalByAdmin(
                    TARGET_ID, new PersonalUpdateRequest("Target", "target@mail.test", null, null, ERole.DOCTOR, SPECIALTY_ID));

            assertThat(personal.getRole()).isEqualTo(ERole.DOCTOR);
            verify(refreshTokenService).revokeAllForUser(CLINIC_ID, TARGET_ID);
        }

        @Test
        void shouldNotRevokeWhenAdminUpdatesOnlyContactDataWithoutPasswordNorRoleChange() {
            target(ERole.ASSISTANT);

            service.updatePersonalByAdmin(
                    TARGET_ID, new PersonalUpdateRequest("Renamed", "target@mail.test", null, null, ERole.ASSISTANT, null));

            verifyNoInteractions(refreshTokenService);
        }

        @Test
        void shouldNotRevokeWhenTargetIsAdministratorAndOnlyRequestedRoleDiffers() {
            target(ERole.ADMINISTRATOR);

            service.updatePersonalByAdmin(
                    TARGET_ID, new PersonalUpdateRequest("Target", "target@mail.test", null, null, ERole.ASSISTANT, null));

            verifyNoInteractions(refreshTokenService);
        }

        @Test
        void shouldRevokeAllExceptCurrentSessionWhenOwnPasswordChanges() {
            var sessionId = UUID.randomUUID();
            target(ERole.ASSISTANT);
            when(passwordEncoder.matches("old-password", "old-hash")).thenReturn(true);
            when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

            service.updateOwnProfile(
                    TARGET_ID,
                    sessionId,
                    new PersonalProfileUpdateRequest("Target", "target@mail.test", null, "old-password", "new-password"));

            verify(refreshTokenService).revokeAllForUserExcept(CLINIC_ID, TARGET_ID, sessionId);
        }

        @Test
        void shouldNotRevokeWhenCurrentPasswordIsIncorrect() {
            var sessionId = UUID.randomUUID();
            target(ERole.ASSISTANT);
            when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);
            var request = new PersonalProfileUpdateRequest("Target", "target@mail.test", null, "wrong", "new-password");

            var thrown = catchThrowable(() -> service.updateOwnProfile(TARGET_ID, sessionId, request));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            verifyNoInteractions(refreshTokenService);
        }

        @Test
        void shouldNotRevokeWhenOwnProfileChangesWithoutNewPassword() {
            target(ERole.ASSISTANT);

            service.updateOwnProfile(
                    TARGET_ID,
                    UUID.randomUUID(),
                    new PersonalProfileUpdateRequest("Renamed", "target@mail.test", null, null, null));

            verifyNoInteractions(refreshTokenService);
        }

        @Test
        void shouldNotRevokeWhenDoctorModeChanges() {
            var personal = admin(false);
            givenPersonal(personal);
            when(specialtyRepository.findById(SPECIALTY_ID))
                    .thenReturn(Optional.of(Specialty.builder().id(SPECIALTY_ID).name("Cardio").build()));
            when(personalRepository.saveAndFlush(personal)).thenReturn(personal);

            service.updateDoctorMode(ADMIN_ID, new DoctorModeRequest(true, SPECIALTY_ID, null, null));

            verifyNoInteractions(refreshTokenService);
        }
    }
}
