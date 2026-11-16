package com.example.pulso.dto.doctoravailability;

import com.example.pulso.validator.timeRange.TimeRange;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalTime;

@TimeRange
public record DoctorAvailabilityRequest(
        @NotNull
        DayOfWeek dayOfWeek,
        @NotNull
        LocalTime startTime,
        @NotNull
        LocalTime endTime,
        @NotNull
        @Min(5)
        Integer slotDurationMinutes
) implements TimeRange.Request {}
