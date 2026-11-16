package com.example.pulso.dto.personal;

import jakarta.validation.constraints.NotNull;

public record AssignAndRemoveRequest(
        @NotNull
        Long patientId,
        @NotNull
        Long doctorId
) {}
