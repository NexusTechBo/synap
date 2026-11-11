package com.example.scheduler.dto.personal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DoctorModeRequest(
        @NotNull
        Boolean enabled,
        Long specialtyId,
        Boolean cancelAppointments,
        @Size(max = 500)
        String cancellationReason
) {}
