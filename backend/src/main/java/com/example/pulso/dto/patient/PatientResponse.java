package com.example.pulso.dto.patient;

public record PatientResponse(
        Long id,
        String document,
        String name,
        String email,
        String phoneNumber,
        boolean active
) {}
