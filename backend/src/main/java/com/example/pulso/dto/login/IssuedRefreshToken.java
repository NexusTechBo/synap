package com.example.pulso.dto.login;

import java.time.Duration;
import java.util.UUID;

public record IssuedRefreshToken(
        String token,
        UUID familyId,
        Duration maxAge
) {}
