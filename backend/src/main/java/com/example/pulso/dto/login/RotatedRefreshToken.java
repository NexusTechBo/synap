package com.example.pulso.dto.login;

public record RotatedRefreshToken(
        IssuedRefreshToken token,
        Long clinicId,
        Long userId
) {}
