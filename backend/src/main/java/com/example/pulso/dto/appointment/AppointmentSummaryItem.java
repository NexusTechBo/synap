package com.example.pulso.dto.appointment;

import com.example.pulso.enums.AppointmentStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record AppointmentSummaryItem(
        Long id,
        String clientName,
        String doctorName,
        LocalDate appointmentDate,
        LocalTime appointmentTime,
        LocalDateTime startTime,
        LocalDateTime endTime,
        AppointmentStatus status,
        Long doctorId,
        Long patientId
) {}
