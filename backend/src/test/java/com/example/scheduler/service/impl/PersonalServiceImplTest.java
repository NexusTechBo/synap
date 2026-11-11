package com.example.scheduler.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.scheduler.dto.personal.DoctorModeRequest;
import com.example.scheduler.dto.personal.PersonalUpdateRequest;
import com.example.scheduler.entity.Personal;
import com.example.scheduler.entity.Specialty;
import com.example.scheduler.enums.AppointmentStatus;
import com.example.scheduler.enums.ERole;
import com.example.scheduler.exception.BusinessException;
import com.example.scheduler.exception.ForbiddenException;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.mapper.PersonalMapper;
import com.example.scheduler.repository.AppointmentRepository;
import com.example.scheduler.repository.DoctorAvailabilityRepository;
import com.example.scheduler.repository.PersonalRepository;
import com.example.scheduler.repository.SpecialtyRepository;
import com.example.scheduler.service.AppointmentService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
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

    private PersonalServiceImpl service;

    @BeforeEach
    void setUp() {
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
                CLOCK
        );
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
}
