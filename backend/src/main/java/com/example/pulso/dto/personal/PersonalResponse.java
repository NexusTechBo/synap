package com.example.pulso.dto.personal;

public record PersonalResponse(
        Long id,
        String username,
        String document,
        String name,
        String email,
        String phoneNumber,
        boolean active,
        boolean alsoDoctor,
        String role,
        Long specialtyId,
        String specialtyName
) {}
