package com.example.scheduler.service.impl;

import com.example.scheduler.dto.doctoravailability.DoctorAvailabilityRequest;
import com.example.scheduler.dto.doctoravailability.DoctorAvailabilityResponse;
import com.example.scheduler.dto.doctoravailability.DoctorAvailabilitySlotsResponse;
import com.example.scheduler.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.scheduler.dto.doctoravailability.SlotResponse;
import com.example.scheduler.entity.Appointment;
import com.example.scheduler.entity.DoctorAvailability;
import com.example.scheduler.entity.ScheduleException;
import com.example.scheduler.enums.AppointmentStatus;
import com.example.scheduler.exception.BadRequestException;
import com.example.scheduler.exception.BusinessException;
import com.example.scheduler.exception.ForbiddenException;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.exception.ResourceNotFoundException;
import com.example.scheduler.mapper.DoctorAvailabilityMapper;
import com.example.scheduler.repository.AppointmentRepository;
import com.example.scheduler.repository.DoctorAvailabilityRepository;
import com.example.scheduler.repository.PersonalRepository;
import com.example.scheduler.repository.ScheduleExceptionRepository;
import com.example.scheduler.service.DoctorAvailabilityService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DoctorAvailabilityServiceImpl implements DoctorAvailabilityService {
    private static final int MAX_RANGE_DAYS = 31;

    private final DoctorAvailabilityRepository doctorAvailabilityRepository;
    private final ScheduleExceptionRepository scheduleExceptionRepository;
    private final AppointmentRepository appointmentRepository;
    private final PersonalRepository personalRepository;
    private final DoctorAvailabilityMapper mapper;
    private final Clock clock;

    @Override
    @Transactional
    public DoctorAvailabilityResponse addDoctorAvailability(Long doctorId, DoctorAvailabilityRequest request) {
        var doctor = personalRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PERSONAL_DOCTOR_NOT_FOUND, doctorId));
        if (!doctor.isDoctor() || !doctor.isActive())
            throw new ForbiddenException(MessageKeys.PERSONAL_DOCTOR_ONLY_ACTIVE);
        var overlaps = doctorAvailabilityRepository.findByDoctorIdAndDayOfWeekAndActiveTrue(doctorId, request.dayOfWeek())
                        .stream()
                        .anyMatch(a -> request.startTime().isBefore(a.getEndTime())
                                && request.endTime().isAfter(a.getStartTime())
                        );
        if (overlaps)
            throw new BusinessException(MessageKeys.AVAILABILITY_OVERLAPS);
        var availability = DoctorAvailability.builder()
                .doctor(doctor)
                .dayOfWeek(request.dayOfWeek())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .slotDurationMinutes(request.slotDurationMinutes())
                .build();
        return mapper.toResponse(doctorAvailabilityRepository.save(availability));
    }

    @Override
    public List<DoctorAvailabilityResponse> getDoctorAvailabilities(Long doctorId) {
        return mapper.toResponseList(doctorAvailabilityRepository.findByDoctorIdAndActiveTrue(doctorId));
    }

    @Override
    public DoctorAvailabilitySlotsResponse getDoctorAvailableSlots(Long doctorId, LocalDate date) {
        var now = LocalDateTime.now(clock);
        var dayOfWeek = date.getDayOfWeek();
        var isActiveDoctor = personalRepository.findActiveDoctorById(doctorId).isPresent();
        if (!isActiveDoctor || isPast(date, now))
            return new DoctorAvailabilitySlotsResponse(date, doctorId, List.of());
        var availabilities = doctorAvailabilityRepository.findByDoctorIdAndDayOfWeekAndActiveTrue(doctorId, dayOfWeek);
        if (availabilities.isEmpty())
            return new DoctorAvailabilitySlotsResponse(date, doctorId, List.of());
        var exceptions = scheduleExceptionRepository.findByDoctorIdAndDate(doctorId, date);
        var startOfDay = date.atStartOfDay();
        var endOfDay = date.atTime(LocalTime.MAX);
        var existingAppointments = appointmentRepository.findByDoctorIdAndStartTimeBetweenAndStatusNot(
                doctorId,
                startOfDay,
                endOfDay,
                AppointmentStatus.CANCELLED
        );
        var availableSlots = findFreeSlots(date, now, availabilities, exceptions, existingAppointments);
        return new DoctorAvailabilitySlotsResponse(date, doctorId, availableSlots);
    }

    @Override
    public DoctorUnavailableDatesResponse getDoctorUnavailableDates(Long doctorId, LocalDate from, LocalDate to) {
        var rangeDays = ChronoUnit.DAYS.between(from, to) + 1;
        if (rangeDays < 1 || rangeDays > MAX_RANGE_DAYS)
            throw new BadRequestException(MessageKeys.AVAILABILITY_INVALID_DATE_RANGE, MAX_RANGE_DAYS);
        var now = LocalDateTime.now(clock);
        var dates = LongStream.range(0, rangeDays).mapToObj(from::plusDays).toList();
        var isActiveDoctor = personalRepository.findActiveDoctorById(doctorId).isPresent();
        if (!isActiveDoctor || isPast(to, now))
            return new DoctorUnavailableDatesResponse(doctorId, from, to, dates);
        var availabilities = doctorAvailabilityRepository.findByDoctorIdAndActiveTrue(doctorId).stream()
                .collect(Collectors.groupingBy(DoctorAvailability::getDayOfWeek));
        var exceptions = scheduleExceptionRepository.findByDoctorIdAndDateBetween(doctorId, from, to).stream()
                .collect(Collectors.groupingBy(ScheduleException::getDate));
        var appointments = appointmentRepository.findByDoctorIdAndStartTimeBetweenAndStatusNot(
                doctorId,
                from.atStartOfDay(),
                to.atTime(LocalTime.MAX),
                AppointmentStatus.CANCELLED
        ).stream().collect(Collectors.groupingBy(a -> a.getStartTime().toLocalDate()));
        var unavailableDates = dates.stream().filter(date -> isPast(date, now) || findFreeSlots(
                date,
                now,
                availabilities.getOrDefault(date.getDayOfWeek(), List.of()),
                exceptions.getOrDefault(date, List.of()),
                appointments.getOrDefault(date, List.of())
        ).isEmpty()).toList();
        return new DoctorUnavailableDatesResponse(doctorId, from, to, unavailableDates);
    }

    @Override
    @Transactional
    public void deactivateDoctorAvailabilityById(Long availabilityId, Long doctorId) {
        var availability = doctorAvailabilityRepository.findByIdAndActiveIsTrue(availabilityId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.AVAILABILITY_NOT_FOUND, availabilityId));
        if (!availability.getDoctor().getId().equals(doctorId))
            throw new ForbiddenException(MessageKeys.AVAILABILITY_UNAUTHORIZED);
        availability.setActive(false);
    }

    private boolean isPast(LocalDate date, LocalDateTime now) {
        return date.isBefore(now.toLocalDate());
    }

    private List<SlotResponse> findFreeSlots(
            LocalDate date,
            LocalDateTime now,
            List<DoctorAvailability> availabilities,
            List<ScheduleException> exceptions,
            List<Appointment> appointments) {
        var isToday = date.equals(now.toLocalDate());
        return createGeneratedSlots(availabilities).stream()
                .distinct()
                .filter(slot -> !isToday || slot.startTime().isAfter(now.toLocalTime()))
                .filter(slot -> exceptions.stream().noneMatch(e -> e.blocks(slot.startTime(), slot.endTime())))
                .filter(slot -> appointments.stream().noneMatch(a -> slot.startTime().isBefore(a.getEndTime().toLocalTime())
                                && slot.endTime().isAfter(a.getStartTime().toLocalTime())))
                .sorted(Comparator.comparing(SlotResponse::startTime))
                .toList();
    }

    private List<SlotResponse> createGeneratedSlots(List<DoctorAvailability> availabilities) {
        var generatedSlots = new ArrayList<SlotResponse>();
        for (var availability : availabilities) {
            var duration = availability.getSlotDurationMinutes();
            if (duration == null || duration <= 0) continue;
            var end = availability.getEndTime().toSecondOfDay() / 60;
            for (int m = availability.getStartTime().toSecondOfDay() / 60; m + duration <= end; m += duration)
                generatedSlots.add(new SlotResponse(
                        LocalTime.ofSecondOfDay(m * 60L),
                        LocalTime.ofSecondOfDay((m + duration) * 60L)
                ));
        }
        return generatedSlots;
    }
}
