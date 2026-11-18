package com.example.pulso.service;

import com.example.pulso.dto.login.IssuedRefreshToken;
import com.example.pulso.dto.login.RotatedRefreshToken;
import java.util.UUID;

public interface RefreshTokenService {
    IssuedRefreshToken issue(Long clinicId, Long userId);

    RotatedRefreshToken rotate(String rawToken);

    void revokeFamily(UUID familyId);

    void revokeFamilyOfToken(String rawToken);

    void revokeAllForUser(Long clinicId, Long userId);

    void revokeAllForUserExcept(Long clinicId, Long userId, UUID keepFamilyId);

    int deleteExpired();
}
