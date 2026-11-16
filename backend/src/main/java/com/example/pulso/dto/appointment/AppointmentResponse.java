package com.example.pulso.dto.appointment;

import com.example.pulso.enums.AppointmentStatus;
import java.time.LocalDateTime;

public record AppointmentResponse(
        Long id,

        LocalDateTime startTime,
        LocalDateTime endTime,

        Long doctorId,
        String doctorName,
        String doctorSpecialty,
        String doctorEmail,

        Long patientId,
        String patientName,
        String patientEmail,

        AppointmentStatus status,
        String cancellationReason,
        LocalDateTime createdAt
) {}
