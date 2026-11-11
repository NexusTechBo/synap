package com.example.scheduler.dto.doctoravailability;

import java.time.LocalDate;
import java.util.List;

public record DoctorUnavailableDatesResponse(
        Long doctorId,
        LocalDate from,
        LocalDate to,
        List<LocalDate> unavailableDates
) {}
