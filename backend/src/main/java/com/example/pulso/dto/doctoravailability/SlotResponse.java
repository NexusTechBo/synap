package com.example.pulso.dto.doctoravailability;

import java.time.LocalTime;

public record SlotResponse(
        LocalTime startTime,
        LocalTime endTime
) {}
