package com.example.pulso.dto.guest;

import com.example.pulso.enums.AppointmentStatus;
import java.time.LocalDateTime;

public record GuestAppointmentResponse(
        Long appointmentId,
        String doctorName,
        String specialtyName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        AppointmentStatus status
) {}
