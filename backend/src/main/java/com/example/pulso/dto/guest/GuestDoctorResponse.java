package com.example.pulso.dto.guest;

public record GuestDoctorResponse(
        Long id,
        String name,
        Long specialtyId,
        String specialtyName
) {}
