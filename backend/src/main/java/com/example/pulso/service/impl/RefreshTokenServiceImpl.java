package com.example.pulso.service.impl;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.dto.login.IssuedRefreshToken;
import com.example.pulso.dto.login.RotatedRefreshToken;
import com.example.pulso.entity.RefreshToken;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.repository.RefreshTokenRepository;
import com.example.pulso.service.RefreshTokenService;
import com.example.pulso.util.TokenUtils;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenServiceImpl implements RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenProperties properties;
    private final Clock clock;

    @Override
    public IssuedRefreshToken issue(Long clinicId, Long userId) {
        var now = LocalDateTime.now(clock);
        return create(clinicId, userId, UUID.randomUUID(), now, now.plus(properties.absoluteTtl()));
    }

    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public RotatedRefreshToken rotate(String rawToken) {
        if (!StringUtils.hasText(rawToken)) throw invalid();
        var current = refreshTokenRepository.findByTokenHashForUpdate(TokenUtils.hash(rawToken))
                .orElseThrow(RefreshTokenServiceImpl::invalid);
        var now = LocalDateTime.now(clock);
        if (current.isRevoked()) {
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            log.warn(
                    "Refresh token reuse detected: family {} of user {} in clinic {} revoked",
                    current.getFamilyId(),
                    current.getUserId(),
                    current.getClinicId());
            throw invalid();
        }
        if (current.isExpired(now)) throw invalid();
        current.setRevokedAt(now);
        var next = create(
                current.getClinicId(),
                current.getUserId(),
                current.getFamilyId(),
                now,
                current.getFamilyExpiresAt());
        return new RotatedRefreshToken(next, current.getClinicId(), current.getUserId());
    }

    @Override
    public void revokeFamily(UUID familyId) {
        refreshTokenRepository.revokeFamily(familyId, LocalDateTime.now(clock));
    }

    @Override
    public void revokeFamilyOfToken(String rawToken) {
        if (!StringUtils.hasText(rawToken)) return;
        refreshTokenRepository.findFamilyIdByTokenHash(TokenUtils.hash(rawToken)).ifPresent(this::revokeFamily);
    }

    @Override
    public void revokeAllForUser(Long clinicId, Long userId) {
        var revoked = refreshTokenRepository.revokeAllByUser(clinicId, userId, LocalDateTime.now(clock));
        log.info("Refresh tokens of user {} in clinic {} revoked: {}", userId, clinicId, revoked);
    }

    @Override
    public void revokeAllForUserExcept(Long clinicId, Long userId, UUID keepFamilyId) {
        var revoked = refreshTokenRepository.revokeAllByUserExceptFamily(
                clinicId, userId, keepFamilyId, LocalDateTime.now(clock));
        log.info("Refresh tokens of user {} in clinic {} revoked except the current session: {}", userId, clinicId, revoked);
    }

    @Override
    public int deleteExpired() {
        return refreshTokenRepository.deleteExpired(LocalDateTime.now(clock));
    }

    private IssuedRefreshToken create(
            Long clinicId, Long userId, UUID familyId, LocalDateTime now, LocalDateTime familyExpiresAt) {
        var slidingExpiresAt = now.plus(properties.ttl());
        var expiresAt = slidingExpiresAt.isBefore(familyExpiresAt) ? slidingExpiresAt : familyExpiresAt;
        var rawToken = TokenUtils.generate();
        refreshTokenRepository.save(RefreshToken.builder()
                .tokenHash(TokenUtils.hash(rawToken))
                .familyId(familyId)
                .clinicId(clinicId)
                .userId(userId)
                .expiresAt(expiresAt)
                .familyExpiresAt(familyExpiresAt)
                .createdAt(now)
                .build());
        return new IssuedRefreshToken(rawToken, familyId, Duration.between(now, expiresAt));
    }

    private static UnauthorizedException invalid() {
        return new UnauthorizedException(MessageKeys.AUTH_REFRESH_INVALID);
    }
}
