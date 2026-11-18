package com.example.pulso.dto.login;

public record AuthSession(
        String accessToken,
        IssuedRefreshToken refreshToken
) {}
