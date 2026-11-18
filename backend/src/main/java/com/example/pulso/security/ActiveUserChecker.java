package com.example.pulso.security;

import com.example.pulso.enums.TokenStatus;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.security.cache.ClinicSettingsVersionCache;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.security.profile.RoleProfile;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActiveUserChecker {
    private final PersonalRepository personalRepository;
    private final ClinicSettingsVersionCache settingsVersionCache;

    public TokenStatus check(Claims claims, RoleProfile profile) {
        if (profile.isGuest())
            return TokenStatus.VALID;
        var userVersion = JwtUtils.extractUserVersion(claims);
        var settingsVersion = JwtUtils.extractSettingsVersion(claims);
        var sessionId = JwtUtils.extractSessionId(claims);
        var clinicId = JwtUtils.extractClinicId(claims);
        if (userVersion.isEmpty() || settingsVersion.isEmpty() || clinicId == null || sessionId.isEmpty())
            return TokenStatus.INVALID;

        var currentUserVersion = personalRepository.findVersionOfActiveById(Long.valueOf(claims.getSubject()));
        if (currentUserVersion.isEmpty())
            return TokenStatus.INVALID;

        var currentSettingsVersion = settingsVersionCache.get(clinicId);
        if (currentSettingsVersion.isEmpty())
            return TokenStatus.INVALID;

        var upToDate = currentUserVersion.get().equals(userVersion.get()) && currentSettingsVersion.get().equals(settingsVersion.get());
        return upToDate ? TokenStatus.VALID : TokenStatus.STALE;
    }
}
