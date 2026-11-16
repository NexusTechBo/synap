package com.example.pulso.dto.guest;

import java.time.Instant;

public record GuestSessionResponse(
        String token,
        Instant expiresAt
) {}
