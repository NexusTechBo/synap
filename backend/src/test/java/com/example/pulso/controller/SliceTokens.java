package com.example.pulso.controller;

import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtil;
import io.jsonwebtoken.Jwts;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

final class SliceTokens {
    static final String ADMIN_TOKEN = "admin-token";
    static final String ASSISTANT_TOKEN = "assistant-token";
    static final String DOCTOR_TOKEN = "doctor-token";
    static final String GUEST_TOKEN = "guest-token";
    static final String NO_TIMEZONE_TOKEN = "no-timezone-token";
    static final long DOCTOR_ID = 2L;
    static final long ADMIN_ID = 1L;
    static final long ASSISTANT_ID = 3L;

    private SliceTokens() {}

    static void givenStandardTokens(JwtUtil jwtUtil, ActiveUserChecker activeUserChecker) {
        givenToken(jwtUtil, ADMIN_TOKEN, ADMIN_ID, "ADMINISTRATOR", List.of("ADMINISTRATOR"));
        givenToken(jwtUtil, ASSISTANT_TOKEN, ASSISTANT_ID, "ASSISTANT", List.of("ASSISTANT"));
        givenToken(jwtUtil, DOCTOR_TOKEN, DOCTOR_ID, "DOCTOR", List.of("DOCTOR"));
        givenToken(jwtUtil, GUEST_TOKEN, 0L, "GUEST", List.of());
        when(activeUserChecker.isActive(anyLong(), anyString(), anyCollection()))
                .thenReturn(true);
    }

    static void givenTokenWithoutTimezone(JwtUtil jwtUtil) {
        var claims = Jwts.claims()
                .subject(Long.toString(ADMIN_ID))
                .add(JwtClaims.ROLE, "ADMINISTRATOR")
                .add(JwtClaims.ROLES, List.of("ADMINISTRATOR"))
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .build();
        when(jwtUtil.parse(NO_TIMEZONE_TOKEN)).thenReturn(Optional.of(claims));
    }

    static MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder builder) {
        return builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    private static void givenToken(JwtUtil jwtUtil, String token, long userId, String role, List<String> roles) {
        var builder = Jwts.claims()
                .subject(Long.toString(userId))
                .add(JwtClaims.ROLE, role)
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz");
        if (!roles.isEmpty()) builder.add(JwtClaims.ROLES, roles);
        when(jwtUtil.parse(token)).thenReturn(Optional.of(builder.build()));
    }
}
