package com.example.pulso.service.impl;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.login.AuthSession;
import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.personal.PersonalResponse;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.ForbiddenException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.AuthService;
import com.example.pulso.service.RefreshTokenService;
import com.example.pulso.util.LogUtils;
import com.example.pulso.util.Utils;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthServiceImpl implements AuthService {
    private final ClinicRepository clinicRepository;
    private final PersonalRepository personalRepository;
    private final PersonalMapper personalMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final String dummyPasswordHash;

    public AuthServiceImpl(
            ClinicRepository clinicRepository,
            PersonalRepository personalRepository,
            PersonalMapper personalMapper,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtil,
            RefreshTokenService refreshTokenService) {
        this.clinicRepository = clinicRepository;
        this.personalRepository = personalRepository;
        this.personalMapper = personalMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Override
    public AuthSession login(LoginRequest request) {
        var username = request.username().toLowerCase(Locale.ROOT);
        var at = username.lastIndexOf('@');
        if (at < 0 || !username.endsWith(Utils.USERNAME_DOMAIN))
            throw loginFailed(
                    "<malformed, length " + username.length() + ">",
                    "malformed_username",
                    new BadRequestException(MessageKeys.AUTH_INVALID_CREDENTIALS)
            );
        var clinic = clinicRepository.findBySlug(username.substring(at + 1, username.length() - Utils.USERNAME_DOMAIN.length()))
                .orElse(null);
        if (clinic == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw loginFailed(
                    username,
                    "unknown_clinic",
                    new UnauthorizedException(MessageKeys.AUTH_INVALID_CREDENTIALS)
            );
        }
        var previousTenant = TenantContext.current();
        try {
            TenantContext.setCurrentTenant(clinic.getId(), clinic.getSlug(), clinic.zoneId(), clinic.getCountry());
            var personal = personalRepository.findByUsername(username).orElse(null);
            var passwordOk = passwordEncoder.matches(request.password(), personal != null ? personal.getPassword() : dummyPasswordHash);
            if (personal == null)
                throw loginFailed(
                        username,
                        "unknown_user",
                        new UnauthorizedException(MessageKeys.AUTH_INVALID_CREDENTIALS)
                );
            if (!passwordOk)
                throw loginFailed(
                        username,
                        "bad_password",
                        new UnauthorizedException(MessageKeys.AUTH_INVALID_CREDENTIALS)
                );
            if (!personal.isActive())
                throw loginFailed(
                        username,
                        "inactive_user",
                        new UnauthorizedException(MessageKeys.AUTH_USER_NOT_ACTIVE)
                );
            if (clinic.getStatus() != ClinicStatus.ACTIVE)
                throw loginFailed(
                        username,
                        "clinic_not_active",
                        new ForbiddenException(MessageKeys.AUTH_CLINIC_NOT_ACTIVATED)
                );
            log.info("Login succeeded for user {} in clinic {}", personal.getId(), clinic.getId());
            var refreshToken = refreshTokenService.issue(clinic.getId(), personal.getId());
            return new AuthSession(jwtUtil.generate(personal, clinic, refreshToken.familyId()), refreshToken);
        } finally {
            TenantContext.restore(previousTenant);
        }
    }

    @Override
    public AuthSession refresh(String rawRefreshToken) {
        var rotated = refreshTokenService.rotate(rawRefreshToken);
        var familyId = rotated.token().familyId();
        var clinic = clinicRepository.findById(rotated.clinicId())
                .filter(c -> c.getStatus() == ClinicStatus.ACTIVE)
                .orElseThrow(() -> refreshRejected(familyId, "clinic_not_active"));
        var previousTenant = TenantContext.current();
        try {
            TenantContext.setCurrentTenant(clinic.getId(), clinic.getSlug(), clinic.zoneId(), clinic.getCountry());
            var personal = personalRepository.findById(rotated.userId())
                    .filter(Personal::isActive)
                    .orElseThrow(() -> refreshRejected(familyId, "inactive_user"));
            return new AuthSession(jwtUtil.generate(personal, clinic, familyId), rotated.token());
        } finally {
            TenantContext.restore(previousTenant);
        }
    }

    @Override
    public void logout(String rawRefreshToken) {
        refreshTokenService.revokeFamilyOfToken(rawRefreshToken);
    }

    @Override
    @Transactional(readOnly = true)
    public PersonalResponse findProfile(Long userId) {
        return personalRepository.findById(userId)
                .map(personalMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PERSONAL_NOT_FOUND, userId));
    }

    private ApiException refreshRejected(UUID familyId, String reason) {
        refreshTokenService.revokeFamily(familyId);
        log.atWarn().addKeyValue("reason", reason)
                .log("Refresh rejected for session family {}: {}", familyId, reason);
        return new UnauthorizedException(MessageKeys.AUTH_REFRESH_INVALID);
    }

    private static ApiException loginFailed(String username, String reason, ApiException exception) {
        log.atWarn().addKeyValue("reason", reason)
                .log("Login failed for {}: {}", LogUtils.sanitizeUsername(username), reason);
        return exception;
    }
}
