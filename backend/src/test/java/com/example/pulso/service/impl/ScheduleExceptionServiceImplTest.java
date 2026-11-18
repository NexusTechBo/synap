package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.scheduleexception.ScheduleExceptionRequest;
import com.example.pulso.dto.scheduleexception.ScheduleExceptionResponse;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.entity.ScheduleException;
import com.example.pulso.enums.AppointmentStatus;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.ForbiddenException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.ScheduleExceptionMapper;
import com.example.pulso.repository.AppointmentRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.repository.ScheduleExceptionRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.component.provider.ClinicTimeProvider;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.service.component.resolver.ClinicLocaleResolver;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

@ExtendWith(MockitoExtension.class)
class ScheduleExceptionServiceImplTest {
    private static final Long DOCTOR_ID = 10L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 4, 10, 0);
    private static final LocalDate TODAY = NOW.toLocalDate();
    private static final LocalDate FUTURE_DATE = LocalDate.of(2026, 11, 10);
    private static final Clock CLOCK = Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private static final List<AppointmentStatus> EXCLUDED = List.of(AppointmentStatus.CANCELLED);

    @Mock
    private ScheduleExceptionRepository scheduleExceptionRepository;

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AppointmentService appointmentService;

    @Mock
    private ScheduleExceptionMapper mapper;

    @Mock
    private MessageSource messageSource;

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    private ScheduleExceptionServiceImpl service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(1L, "demo", ZoneOffset.UTC, SupportedCountry.BO);
        lenient().when(currentClinicProvider.getCurrentClinic())
                .thenReturn(Clinic.builder().defaultLanguage(ClinicLanguage.ES).build());
        service = new ScheduleExceptionServiceImpl(
                scheduleExceptionRepository,
                personalRepository,
                appointmentRepository,
                appointmentService,
                mapper,
                new ClinicTimeProvider(CLOCK),
                messageSource,
                new ClinicLocaleResolver(currentClinicProvider)
        );
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
        TenantContext.clear();
    }

    private Personal givenDoctor() {
        var doctor = Personal.builder().id(DOCTOR_ID).role(ERole.DOCTOR).build();
        when(personalRepository.findByIdForUpdate(DOCTOR_ID)).thenReturn(Optional.of(doctor));
        return doctor;
    }

    private void givenSaveReturnsArgument() {
        when(scheduleExceptionRepository.save(any(ScheduleException.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private ScheduleException captureSaved() {
        var captor = ArgumentCaptor.forClass(ScheduleException.class);
        verify(scheduleExceptionRepository).save(captor.capture());
        return captor.getValue();
    }

    private static ScheduleExceptionRequest fullDay(LocalDate date, String reason, Boolean cancelAppointments) {
        return new ScheduleExceptionRequest(date, null, null, true, reason, cancelAppointments);
    }

    private static <T extends ApiException> T assertApiException(
            ThrowingCallable call,
            Class<T> type,
            String messageKey
    ) {
        var thrown = catchThrowable(call);
        assertThat(thrown).isInstanceOf(type);
        var ex = type.cast(thrown);
        assertThat(ex.getMessageKey()).isEqualTo(messageKey);
        return ex;
    }

    @Nested
    @DisplayName("clinic time zone")
    class ClinicTimeZone {
        private static final Instant INSTANT = Instant.parse("2026-11-04T03:30:00Z");
        private static final LocalDate LOCAL_DATE_IN_LA_PAZ = LocalDate.of(2026, 11, 3);

        private ScheduleExceptionServiceImpl serviceInZone(String zone) {
            TenantContext.setCurrentTenant(1L, "demo", ZoneId.of(zone), SupportedCountry.BO);
            return new ScheduleExceptionServiceImpl(
                    scheduleExceptionRepository,
                    personalRepository,
                    appointmentRepository,
                    appointmentService,
                    mapper,
                    new ClinicTimeProvider(Clock.fixed(INSTANT, ZoneOffset.UTC)),
                    messageSource,
                    new ClinicLocaleResolver(currentClinicProvider)
            );
        }

        @Test
        @DisplayName("rejects yesterday's date in a clinic already past midnight")
        void shouldRejectDateInThePastForSaoPauloClinic() {
            var saoPauloService = serviceInZone("America/Sao_Paulo");
            givenDoctor();

            assertApiException(
                    () -> saoPauloService.addDoctorScheduleException(
                            DOCTOR_ID, fullDay(LOCAL_DATE_IN_LA_PAZ, null, null)),
                    BadRequestException.class,
                    MessageKeys.SCHEDULE_EXCEPTION_DATE_PAST
            );
            verify(scheduleExceptionRepository, never()).save(any());
        }

        @Test
        @DisplayName("accepts the same date as today in a clinic still before midnight")
        void shouldAcceptSameDateForLaPazClinic() {
            var laPazService = serviceInZone("America/La_Paz");
            givenDoctor();
            givenSaveReturnsArgument();

            laPazService.addDoctorScheduleException(DOCTOR_ID, fullDay(LOCAL_DATE_IN_LA_PAZ, null, null));

            assertThat(captureSaved().getDate()).isEqualTo(LOCAL_DATE_IN_LA_PAZ);
        }
    }

    @Nested
    class AddDoctorScheduleException {
        @Test
        void shouldThrowNotFoundWhenDoctorDoesNotExist() {
            when(personalRepository.findByIdForUpdate(DOCTOR_ID)).thenReturn(Optional.empty());

            var ex = assertApiException(
                    () -> service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, null)),
                    ResourceNotFoundException.class,
                    MessageKeys.PERSONAL_DOCTOR_NOT_FOUND
            );

            assertThat(ex.getArgs()).containsExactly(DOCTOR_ID);
            verify(scheduleExceptionRepository, never()).save(any());
        }

        @Test
        void shouldThrowBadRequestWhenDateIsInThePast() {
            givenDoctor();

            assertApiException(
                    () -> service.addDoctorScheduleException(DOCTOR_ID, fullDay(TODAY.minusDays(1), null, null)),
                    BadRequestException.class,
                    MessageKeys.SCHEDULE_EXCEPTION_DATE_PAST
            );
            verify(scheduleExceptionRepository, never()).save(any());
            verifyNoInteractions(appointmentRepository);
        }

        @Test
        void shouldSaveFullDayBlockWithoutTimesWhenNoAppointmentsAreAffected() {
            var doctor = givenDoctor();
            givenSaveReturnsArgument();
            var response = new ScheduleExceptionResponse(1L, FUTURE_DATE, null, null, true, "Congreso");
            when(mapper.toResponse(any(ScheduleException.class))).thenReturn(response);
            var request = new ScheduleExceptionRequest(
                    FUTURE_DATE,
                    LocalTime.of(9, 0),
                    LocalTime.of(10, 0),
                    true,
                    "Congreso",
                    null
            );

            var result = service.addDoctorScheduleException(DOCTOR_ID, request);

            assertThat(result).isSameAs(response);
            var saved = captureSaved();
            assertThat(saved.getDoctor()).isSameAs(doctor);
            assertThat(saved.getDate()).isEqualTo(FUTURE_DATE);
            assertThat(saved.getIsFullDayBlock()).isTrue();
            assertThat(saved.getStartTime()).isNull();
            assertThat(saved.getEndTime()).isNull();
            assertThat(saved.getReason()).isEqualTo("Congreso");
            verify(appointmentRepository).countOverlappingAppointments(
                    DOCTOR_ID,
                    FUTURE_DATE.atStartOfDay(),
                    FUTURE_DATE.plusDays(1).atStartOfDay(),
                    EXCLUDED
            );
            verifyNoInteractions(appointmentService);
        }

        @Test
        void shouldSavePartialBlockWithTimesAndCountOnlyThatRange() {
            givenDoctor();
            givenSaveReturnsArgument();
            var request = new ScheduleExceptionRequest(
                    FUTURE_DATE,
                    LocalTime.of(9, 0),
                    LocalTime.of(11, 0),
                    false,
                    null,
                    null
            );

            service.addDoctorScheduleException(DOCTOR_ID, request);

            var saved = captureSaved();
            assertThat(saved.getIsFullDayBlock()).isFalse();
            assertThat(saved.getStartTime()).isEqualTo(LocalTime.of(9, 0));
            assertThat(saved.getEndTime()).isEqualTo(LocalTime.of(11, 0));
            verify(appointmentRepository).countOverlappingAppointments(
                    DOCTOR_ID,
                    FUTURE_DATE.atTime(9, 0),
                    FUTURE_DATE.atTime(11, 0),
                    EXCLUDED
            );
        }

        @Test
        void shouldAcceptTodayAndCountOnlyFromNowForFullDayBlock() {
            givenDoctor();
            givenSaveReturnsArgument();

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(TODAY, null, null));

            verify(appointmentRepository).countOverlappingAppointments(
                    DOCTOR_ID,
                    NOW,
                    TODAY.plusDays(1).atStartOfDay(),
                    EXCLUDED
            );
        }

        @Test
        void shouldSkipOverlapCountWhenPartialBlockTodayIsAlreadyOver() {
            givenDoctor();
            givenSaveReturnsArgument();
            var request =
                    new ScheduleExceptionRequest(TODAY, LocalTime.of(8, 0), LocalTime.of(10, 0), false, null, true);

            service.addDoctorScheduleException(DOCTOR_ID, request);

            verifyNoInteractions(appointmentRepository, appointmentService);
            verify(scheduleExceptionRepository).save(any(ScheduleException.class));
        }

        @Test
        void shouldThrowConflictWithCountDetailsWhenAppointmentsAffectedAndNotConfirmed() {
            givenDoctor();
            givenAffected(3L);

            var ex = assertApiException(
                    () -> service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, null)),
                    BusinessException.class,
                    MessageKeys.SCHEDULE_EXCEPTION_ACTIVE_APPOINTMENTS_CONFLICT
            );

            assertThat(ex.getStatus().value()).isEqualTo(409);
            assertThat(ex.getArgs()).containsExactly(3L);
            assertThat(ex.getDetails()).containsExactly(entry("count", 3L));
            verify(scheduleExceptionRepository, never()).save(any());
            verifyNoInteractions(appointmentService);
        }

        @Test
        void shouldThrowConflictWhenAppointmentsAffectedAndCancelExplicitlyFalse() {
            givenDoctor();
            givenAffected(1L);

            assertApiException(
                    () -> service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, false)),
                    BusinessException.class,
                    MessageKeys.SCHEDULE_EXCEPTION_ACTIVE_APPOINTMENTS_CONFLICT
            );
            verify(scheduleExceptionRepository, never()).save(any());
        }

        @Test
        void shouldSaveAndCancelAffectedAppointmentsWithGivenReasonWhenConfirmed() {
            givenDoctor();
            givenAffected(2L);
            givenSaveReturnsArgument();

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, "Congreso", true));

            verify(scheduleExceptionRepository).save(any(ScheduleException.class));
            verify(appointmentService).cancelDoctorAppointmentsInRange(
                    DOCTOR_ID,
                    FUTURE_DATE.atStartOfDay(),
                    FUTURE_DATE.plusDays(1).atStartOfDay(),
                    "Congreso"
            );
            verifyNoInteractions(messageSource);
        }

        @Test
        void shouldCancelWithDefaultReasonWhenReasonIsBlank() {
            givenDoctor();
            givenAffected(1L);
            givenSaveReturnsArgument();
            when(messageSource.getMessage(
                    eq(MessageKeys.SCHEDULE_EXCEPTION_DEFAULT_CANCELLATION_REASON),
                    isNull(),
                    any(Locale.class)
            )).thenReturn("El doctor bloqueó este horario");

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, "   ", true));

            verify(appointmentService).cancelDoctorAppointmentsInRange(
                    eq(DOCTOR_ID),
                    any(),
                    any(),
                    eq("El doctor bloqueó este horario")
            );
        }

        @Test
        void shouldCancelWithDefaultReasonWhenReasonIsNull() {
            givenDoctor();
            givenAffected(1L);
            givenSaveReturnsArgument();
            when(messageSource.getMessage(
                    eq(MessageKeys.SCHEDULE_EXCEPTION_DEFAULT_CANCELLATION_REASON),
                    isNull(),
                    any(Locale.class)
            )).thenReturn("default");

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, true));

            verify(appointmentService).cancelDoctorAppointmentsInRange(eq(DOCTOR_ID), any(), any(), eq("default"));
        }

        @Test
        void shouldResolveDefaultReasonInClinicLanguageIgnoringRequestLocale() {
            when(currentClinicProvider.getCurrentClinic())
                    .thenReturn(Clinic.builder().defaultLanguage(ClinicLanguage.EN).build());
            LocaleContextHolder.setLocale(Locale.forLanguageTag("es"));
            givenDoctor();
            givenAffected(1L);
            givenSaveReturnsArgument();
            when(messageSource.getMessage(
                    eq(MessageKeys.SCHEDULE_EXCEPTION_DEFAULT_CANCELLATION_REASON),
                    isNull(),
                    eq(Locale.ENGLISH)
            )).thenReturn("Doctor blocked this slot");

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, true));

            verify(appointmentService).cancelDoctorAppointmentsInRange(
                    eq(DOCTOR_ID), any(), any(), eq("Doctor blocked this slot"));
        }

        @Test
        void shouldNotCancelWhenConfirmedButNoAppointmentsAffected() {
            givenDoctor();
            givenSaveReturnsArgument();

            service.addDoctorScheduleException(DOCTOR_ID, fullDay(FUTURE_DATE, null, true));

            verify(appointmentService, never()).cancelDoctorAppointmentsInRange(anyLong(), any(), any(), anyString());
        }

        private void givenAffected(long count) {
            when(appointmentRepository.countOverlappingAppointments(eq(DOCTOR_ID), any(), any(), eq(EXCLUDED)))
                    .thenReturn(count);
        }
    }

    @Nested
    class FindDoctorScheduleExceptions {
        @Test
        void shouldReturnMappedExceptionsFromDate() {
            var entities = List.of(ScheduleException.builder().id(1L).build());
            var responses = List.of(new ScheduleExceptionResponse(1L, FUTURE_DATE, null, null, true, null));
            when(scheduleExceptionRepository.findByDoctorIdAndDateGreaterThanEqualOrderByDateAscStartTimeAsc(
                    DOCTOR_ID,
                    TODAY
            )).thenReturn(entities);
            when(mapper.toResponseList(entities)).thenReturn(responses);

            assertThat(service.findDoctorScheduleExceptions(DOCTOR_ID, TODAY)).isSameAs(responses);
        }
    }

    @Nested
    class DeleteDoctorScheduleExceptionById {
        @Test
        void shouldThrowNotFoundWhenExceptionDoesNotExist() {
            when(scheduleExceptionRepository.findById(5L)).thenReturn(Optional.empty());

            var ex = assertApiException(
                    () -> service.deleteDoctorScheduleExceptionById(5L, DOCTOR_ID),
                    ResourceNotFoundException.class,
                    MessageKeys.SCHEDULE_EXCEPTION_NOT_FOUND
            );

            assertThat(ex.getArgs()).containsExactly(5L);
        }

        @Test
        void shouldThrowForbiddenWhenExceptionBelongsToAnotherDoctor() {
            var exception = ownedBy(99L);
            when(scheduleExceptionRepository.findById(5L)).thenReturn(Optional.of(exception));

            assertApiException(
                    () -> service.deleteDoctorScheduleExceptionById(5L, DOCTOR_ID),
                    ForbiddenException.class,
                    MessageKeys.COMMON_FORBIDDEN
            );
            verify(scheduleExceptionRepository, never()).delete(any());
        }

        @Test
        void shouldDeleteWhenExceptionBelongsToDoctor() {
            var exception = ownedBy(DOCTOR_ID);
            when(scheduleExceptionRepository.findById(5L)).thenReturn(Optional.of(exception));

            service.deleteDoctorScheduleExceptionById(5L, DOCTOR_ID);

            verify(scheduleExceptionRepository).delete(exception);
        }

        private ScheduleException ownedBy(Long doctorId) {
            return ScheduleException.builder()
                    .id(5L)
                    .doctor(Personal.builder().id(doctorId).build())
                    .build();
        }
    }
}
