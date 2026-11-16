package com.example.pulso.websocket.event;

import com.example.pulso.enums.AppointmentStatus;

public record BoardEvent(Long appointmentId, AppointmentStatus status) {}
