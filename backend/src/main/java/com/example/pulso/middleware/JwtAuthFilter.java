package com.example.pulso.middleware;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.RoleProfile;
import com.example.pulso.security.SecurityUtils;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.util.LogKeys;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final ActiveUserChecker activeUserChecker;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain
    ) throws ServletException, IOException {
        try {
            var token = SecurityUtils.extractBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
            if (token != null) {
                jwtUtil.parse(token).ifPresent(claims -> {
                    try {
                        authenticate(request, claims);
                    } catch (RuntimeException e) {
                        log.warn("Token claims rejected: {}", e.getClass().getSimpleName());
                        SecurityContextHolder.clearContext();
                        TenantContext.clear();
                    }
                });
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            MDC.remove(LogKeys.USER_ID);
            MDC.remove(LogKeys.ROLE);
        }
    }

    private void authenticate(HttpServletRequest request, Claims claims) {
        var clinicId = claims.get(JwtClaims.CLINIC_ID, Long.class);
        TenantContext.setCurrentTenant(clinicId, claims.get(JwtClaims.CLINIC_SLUG, String.class), JwtUtil.extractZone(claims), JwtUtil.extractCountry(claims));
        var roles = JwtUtil.extractRoles(claims);
        var userId = Long.valueOf(claims.getSubject());
        var profile = RoleProfile.fromRoles(roles).orElse(null);
        try {
            if (profile == null || !activeUserChecker.isActive(userId, profile)) {
                log.warn(
                        "Token rejected: user {} with roles {} in clinic {} is inactive or its roles changed",
                        userId,
                        roles,
                        clinicId
                );
                return;
            }
        } catch (DataAccessException e) {
            log.warn(
                    "Active user lookup failed for user {}: {}",
                    userId,
                    e.getClass().getSimpleName()
            );
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(SecurityUtils.authenticated(claims.getSubject(), roles));
        bindLogContext(
                request,
                clinicId,
                profile.isGuest() ? LogKeys.GUEST_USER : claims.getSubject(),
                profile.primary().name()
        );
    }

    private static void bindLogContext(HttpServletRequest request, Long clinicId, String userId, String role) {
        MDC.put(LogKeys.USER_ID, userId);
        MDC.put(LogKeys.ROLE, role);
        if (clinicId != null) request.setAttribute(LogKeys.ATTR_CLINIC_ID, clinicId.toString());
        request.setAttribute(LogKeys.ATTR_USER_ID, userId);
        request.setAttribute(LogKeys.ATTR_ROLE, role);
    }
}
