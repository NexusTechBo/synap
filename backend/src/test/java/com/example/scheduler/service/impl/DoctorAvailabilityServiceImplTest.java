package com.example.scheduler.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.scheduler.dto.doctoravailability.SlotResponse;
import com.example.scheduler.entity.Appointment;
import com.example.scheduler.entity.DoctorAvailability;
import com.example.scheduler.entity.Personal;
import com.example.scheduler.entity.ScheduleException;
import com.example.scheduler.enums.AppointmentStatus;
import com.example.scheduler.exception.ApiException;
import com.example.scheduler.exception.BadRequestException;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.mapper.DoctorAvailabilityMapper;
import com.example.scheduler.repository.AppointmentRepository;
import com.example.scheduler.repository.DoctorAvailabilityRepository;
import com.example.scheduler.repository.PersonalRepository;
import com.example.scheduler.repository.ScheduleExceptionRepository;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DoctorAvailabilityServiceImplTest {
    private static final Long DOCTOR_ID = 10L;
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 11, 4);
    private static final LocalDate THURSDAY = WEDNESDAY.plusDays(1);
    private static final LocalDate FRIDAY = WEDNESDAY.plusDays(2);
    private static final LocalDate SATURDAY = WEDNESDAY.plusDays(3);
    private static final LocalDate SUNDAY = WEDNESDAY.plusDays(4);
    private static final LocalDate MONDAY = WEDNESDAY.plusDays(5);
    private static final LocalDateTime NOW = WEDNESDAY.atTime(8, 0);
    private static final LocalTime NINE = LocalTime.of(9, 0);
    private static final LocalTime NINE_THIRTY = LocalTime.of(9, 30);
    private static final LocalTime TEN = LocalTime.of(10, 0);

    @Mock
    private DoctorAvailabilityRepository doctorAvailabilityRepository;

    @Mock
    private ScheduleExceptionRepository scheduleExceptionRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private DoctorAvailabilityMapper mapper;

    private final List<DoctorAvailability> availabilities = new ArrayList<>();
    private final List<ScheduleException> exceptions = new ArrayList<>();
    private final List<Appointment> appointments = new ArrayList<>();

    private DoctorAvailabilityServiceImpl serviceAt(LocalDateTime now) {
        return new DoctorAvailabilityServiceImpl(
                doctorAvailabilityRepository,
                scheduleExceptionRepository,
                appointmentRepository,
                personalRepository,
                mapper,
                Clock.fixed(now.toInstant(ZoneOffset.UTC), ZoneOffset.UTC));
    }

    private void givenActiveDoctor() {
        when(personalRepository.findActiveDoctorById(DOCTOR_ID))
                .thenReturn(Optional.of(Personal.builder().id(DOCTOR_ID).build()));
    }

    private void givenRangeData() {
        givenActiveDoctor();
        when(doctorAvailabilityRepository.findByDoctorIdAndActiveTrue(DOCTOR_ID))
                .thenReturn(availabilities);
        when(scheduleExceptionRepository.findByDoctorIdAndDateBetween(eq(DOCTOR_ID), any(), any()))
                .thenAnswer(call -> {
                    LocalDate from = call.getArgument(1);
                    LocalDate to = call.getArgument(2);
                    return exceptions.stream()
                            .filter(e ->
                                    !e.getDate().isBefore(from) && !e.getDate().isAfter(to))
                            .toList();
                });
        givenAppointmentQuery();
    }

    private void givenAppointmentQuery() {
        when(appointmentRepository.findByDoctorIdAndStartTimeBetweenAndStatusNot(eq(DOCTOR_ID), any(), any(), any()))
                .thenAnswer(call -> {
                    LocalDateTime start = call.getArgument(1);
                    LocalDateTime end = call.getArgument(2);
                    AppointmentStatus excluded = call.getArgument(3);
                    return appointments.stream()
                            .filter(a -> a.getStatus() != excluded)
                            .filter(a -> !a.getStartTime().isBefore(start)
                                    && !a.getStartTime().isAfter(end))
                            .toList();
                });
    }

    private void givenPerDayData() {
        when(doctorAvailabilityRepository.findByDoctorIdAndDayOfWeekAndActiveTrue(eq(DOCTOR_ID), any()))
                .thenAnswer(call -> availabilities.stream()
                        .filter(a -> a.getDayOfWeek() == call.getArgument(1))
                        .toList());
        when(scheduleExceptionRepository.findByDoctorIdAndDate(eq(DOCTOR_ID), any()))
                .thenAnswer(call -> exceptions.stream()
                        .filter(e -> e.getDate().equals(call.getArgument(1)))
                        .toList());
    }

    private void doctorWorks(LocalTime start, LocalTime end, DayOfWeek... days) {
        Arrays.stream(days)
                .map(day -> DoctorAvailability.builder()
                        .dayOfWeek(day)
                        .startTime(start)
                        .endTime(end)
                        .slotDurationMinutes(30)
                        .build())
                .forEach(availabilities::add);
    }

    private void doctorWorksWeekdays() {
        doctorWorks(
                NINE,
                TEN,
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY);
    }

    private void appointment(LocalDate date, LocalTime start, LocalTime end, AppointmentStatus status) {
        appointments.add(Appointment.builder()
                .startTime(date.atTime(start))
                .endTime(date.atTime(end))
                .status(status)
                .build());
    }

    private void fullDayBlock(LocalDate date) {
        exceptions.add(
                ScheduleException.builder().date(date).isFullDayBlock(true).build());
    }

    private void partialBlock(LocalDate date, LocalTime start, LocalTime end) {
        exceptions.add(ScheduleException.builder()
                .date(date)
                .startTime(start)
                .endTime(end)
                .isFullDayBlock(false)
                .build());
    }

    @Nested
    class GetDoctorUnavailableDates {
        @Test
        void shouldReturnTheRequestedRangeAndListNonWorkingDaysWhenDoctorWorksWeekdays() {
            doctorWorksWeekdays();
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, MONDAY);

            assertThat(response.doctorId()).isEqualTo(DOCTOR_ID);
            assertThat(response.from()).isEqualTo(WEDNESDAY);
            assertThat(response.to()).isEqualTo(MONDAY);
            assertThat(response.unavailableDates()).containsExactly(SATURDAY, SUNDAY);
        }

        @Test
        void shouldListDateWhenAllSlotsAreTakenByPendingOrConfirmedAppointments() {
            doctorWorksWeekdays();
            appointment(THURSDAY, NINE, NINE_THIRTY, AppointmentStatus.PENDING);
            appointment(THURSDAY, NINE_THIRTY, TEN, AppointmentStatus.CONFIRMED);
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).containsExactly(THURSDAY);
        }

        @Test
        void shouldNotListDateWhenOneOfItsAppointmentsIsCancelled() {
            doctorWorksWeekdays();
            appointment(THURSDAY, NINE, NINE_THIRTY, AppointmentStatus.PENDING);
            appointment(THURSDAY, NINE_THIRTY, TEN, AppointmentStatus.CANCELLED);
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).isEmpty();
        }

        @Test
        void shouldListDateWhenFullDayExceptionBlocksIt() {
            doctorWorksWeekdays();
            fullDayBlock(THURSDAY);
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).containsExactly(THURSDAY);
        }

        @Test
        void shouldNotListDateWhenPartialExceptionLeavesFreeSlots() {
            doctorWorksWeekdays();
            partialBlock(THURSDAY, NINE, NINE_THIRTY);
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).isEmpty();
        }

        @Test
        void shouldListDateWhenPartialExceptionCoversEverySlot() {
            doctorWorksWeekdays();
            partialBlock(THURSDAY, NINE, TEN);
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).containsExactly(THURSDAY);
        }

        @Test
        void shouldListTodayWhenAllItsRemainingSlotsHavePassed() {
            doctorWorksWeekdays();
            givenRangeData();

            var response = serviceAt(WEDNESDAY.atTime(9, 30)).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, THURSDAY);

            assertThat(response.unavailableDates()).containsExactly(WEDNESDAY);
        }

        @Test
        void shouldNotListTodayWhenASlotIsStillAhead() {
            doctorWorksWeekdays();
            givenRangeData();

            var response = serviceAt(WEDNESDAY.atTime(9, 29)).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, THURSDAY);

            assertThat(response.unavailableDates()).isEmpty();
        }

        @Test
        void shouldListPastDatesWhenRangeStartsBeforeToday() {
            doctorWorksWeekdays();
            givenRangeData();

            var response = serviceAt(THURSDAY.atTime(8, 0)).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, THURSDAY);

            assertThat(response.unavailableDates()).containsExactly(WEDNESDAY);
        }

        @Test
        void shouldListEveryDateWithoutLoadingScheduleWhenRangeIsInThePast() {
            givenActiveDoctor();

            var response = serviceAt(SATURDAY.atTime(8, 0)).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, FRIDAY);

            assertThat(response.unavailableDates()).containsExactly(WEDNESDAY, THURSDAY, FRIDAY);
            verifyNoInteractions(doctorAvailabilityRepository, scheduleExceptionRepository, appointmentRepository);
        }

        @Test
        void shouldListEveryDateWithoutLoadingScheduleWhenDoctorIsNotActive() {
            when(personalRepository.findActiveDoctorById(DOCTOR_ID)).thenReturn(Optional.empty());

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, THURSDAY, FRIDAY);

            assertThat(response.unavailableDates()).containsExactly(THURSDAY, FRIDAY);
            verifyNoInteractions(doctorAvailabilityRepository, scheduleExceptionRepository, appointmentRepository);
        }

        @Test
        void shouldUseOneQueryPerSourceAndNoPerDayQueriesWhenRangeHasManyDays() {
            doctorWorksWeekdays();
            givenRangeData();

            serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, WEDNESDAY, WEDNESDAY.plusDays(30));

            verify(personalRepository).findActiveDoctorById(DOCTOR_ID);
            verify(doctorAvailabilityRepository).findByDoctorIdAndActiveTrue(DOCTOR_ID);
            verify(scheduleExceptionRepository)
                    .findByDoctorIdAndDateBetween(DOCTOR_ID, WEDNESDAY, WEDNESDAY.plusDays(30));
            verify(appointmentRepository)
                    .findByDoctorIdAndStartTimeBetweenAndStatusNot(
                            DOCTOR_ID,
                            WEDNESDAY.atStartOfDay(),
                            WEDNESDAY.plusDays(30).atTime(LocalTime.MAX),
                            AppointmentStatus.CANCELLED);
            verify(doctorAvailabilityRepository, never()).findByDoctorIdAndDayOfWeekAndActiveTrue(anyLong(), any());
            verify(scheduleExceptionRepository, never()).findByDoctorIdAndDate(anyLong(), any());
        }

        @Test
        void shouldAcceptSingleDayRange() {
            doctorWorksWeekdays();
            givenRangeData();

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, SATURDAY, SATURDAY);

            assertThat(response.unavailableDates()).containsExactly(SATURDAY);
        }

        @Test
        void shouldThrowBadRequestWhenToIsBeforeFrom() {
            assertInvalidRange(THURSDAY, WEDNESDAY);
        }

        @Test
        void shouldThrowBadRequestWhenRangeHasThirtyTwoDays() {
            assertInvalidRange(WEDNESDAY, WEDNESDAY.plusDays(31));
        }

        @Test
        void shouldNotOverflowWhenRangeEndsOnTheLastSupportedDate() {
            when(personalRepository.findActiveDoctorById(DOCTOR_ID)).thenReturn(Optional.empty());

            var response = serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, LocalDate.MAX, LocalDate.MAX);

            assertThat(response.unavailableDates()).containsExactly(LocalDate.MAX);
        }

        private void assertInvalidRange(LocalDate from, LocalDate to) {
            var thrown = catchThrowable(() -> serviceAt(NOW).getDoctorUnavailableDates(DOCTOR_ID, from, to));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.AVAILABILITY_INVALID_DATE_RANGE);
            verifyNoInteractions(personalRepository);
        }
    }

    @Nested
    class PerDayAndRangeAgreement {
        @Test
        void shouldListExactlyTheDatesWhosePerDaySlotsAreEmpty() {
            var now = WEDNESDAY.atTime(9, 30);
            var from = WEDNESDAY.minusDays(2);
            var to = from.plusDays(30);
            doctorWorksWeekdays();
            doctorWorks(LocalTime.of(14, 0), LocalTime.of(14, 30), DayOfWeek.FRIDAY);
            doctorWorks(NINE, LocalTime.of(9, 45), DayOfWeek.SATURDAY);
            appointment(THURSDAY, NINE, NINE_THIRTY, AppointmentStatus.PENDING);
            appointment(THURSDAY, NINE_THIRTY, TEN, AppointmentStatus.CONFIRMED);
            appointment(MONDAY, NINE, TEN, AppointmentStatus.CONFIRMED);
            appointment(MONDAY.plusDays(1), NINE, TEN, AppointmentStatus.CANCELLED);
            appointment(FRIDAY, NINE, TEN, AppointmentStatus.CONFIRMED);
            fullDayBlock(MONDAY.plusDays(2));
            partialBlock(MONDAY.plusDays(3), NINE, NINE_THIRTY);
            partialBlock(MONDAY.plusDays(4), NINE, TEN);
            partialBlock(SATURDAY, NINE, LocalTime.of(9, 15));
            givenRangeData();
            givenPerDayData();
            var service = serviceAt(now);

            var listed = service.getDoctorUnavailableDates(DOCTOR_ID, from, to).unavailableDates();

            var withoutSlots = from.datesUntil(to.plusDays(1))
                    .filter(date -> slotsOn(service, date).isEmpty())
                    .toList();
            assertThat(listed).isEqualTo(withoutSlots).isSorted().isNotEmpty();
            assertThat(listed).hasSizeLessThan(31);
        }

        private List<SlotResponse> slotsOn(DoctorAvailabilityServiceImpl service, LocalDate date) {
            return service.getDoctorAvailableSlots(DOCTOR_ID, date).availableSlots();
        }
    }

    @Nested
    class GetDoctorAvailableSlots {
        @Test
        void shouldReturnSortedFreeSlotsWhenSomeAreTakenOrBlocked() {
            doctorWorks(NINE, LocalTime.of(11, 0), DayOfWeek.THURSDAY);
            appointment(THURSDAY, NINE, NINE_THIRTY, AppointmentStatus.CONFIRMED);
            partialBlock(THURSDAY, TEN, LocalTime.of(10, 30));
            givenActiveDoctor();
            givenPerDayData();
            givenAppointmentQuery();

            var response = serviceAt(NOW).getDoctorAvailableSlots(DOCTOR_ID, THURSDAY);

            assertThat(response.availableSlots())
                    .containsExactly(
                            new SlotResponse(NINE_THIRTY, TEN),
                            new SlotResponse(LocalTime.of(10, 30), LocalTime.of(11, 0)));
        }

        @Test
        void shouldReturnNoSlotsWithoutLoadingScheduleWhenDateIsInThePast() {
            givenActiveDoctor();

            var response = serviceAt(THURSDAY.atTime(8, 0)).getDoctorAvailableSlots(DOCTOR_ID, WEDNESDAY);

            assertThat(response.availableSlots()).isEmpty();
            verifyNoInteractions(doctorAvailabilityRepository, scheduleExceptionRepository, appointmentRepository);
        }
    }
}
