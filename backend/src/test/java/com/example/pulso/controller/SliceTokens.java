package com.example.pulso.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.example.pulso.enums.TokenStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.security.profile.RoleProfile;
import io.jsonwebtoken.Claims;
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
    static final String LEGACY_ROLE_GUEST_TOKEN = "legacy-role-guest-token";
    static final String NO_TIMEZONE_TOKEN = "no-timezone-token";
    static final String NO_COUNTRY_TOKEN = "no-country-token";
    static final String INVALID_COUNTRY_TOKEN = "invalid-country-token";
    static final long DOCTOR_ID = 2L;
    static final long ADMIN_ID = 1L;
    static final long ASSISTANT_ID = 3L;

    private SliceTokens() {}

    static void givenStandardTokens(JwtUtils jwtUtil, ActiveUserChecker activeUserChecker) {
        givenToken(jwtUtil, ADMIN_TOKEN, ADMIN_ID, List.of("ADMINISTRATOR"));
        givenToken(jwtUtil, ASSISTANT_TOKEN, ASSISTANT_ID, List.of("ASSISTANT"));
        givenToken(jwtUtil, DOCTOR_TOKEN, DOCTOR_ID, List.of("DOCTOR"));
        givenToken(jwtUtil, GUEST_TOKEN, 0L, List.of("GUEST"));
        when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class)))
                .thenReturn(TokenStatus.VALID);
    }

    static void givenLegacyRoleOnlyGuestToken(JwtUtils jwtUtil) {
        var claims = Jwts.claims()
                .subject("0")
                .add("role", "GUEST")
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz")
                .add(JwtClaims.COUNTRY, "BO")
                .build();
        when(jwtUtil.parse(LEGACY_ROLE_GUEST_TOKEN)).thenReturn(Optional.of(claims));
    }

    static void givenTokenWithoutTimezone(JwtUtils jwtUtil) {
        var claims = Jwts.claims()
                .subject(Long.toString(ADMIN_ID))
                .add(JwtClaims.ROLES, List.of("ADMINISTRATOR"))
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .build();
        when(jwtUtil.parse(NO_TIMEZONE_TOKEN)).thenReturn(Optional.of(claims));
    }

    static void givenTokenWithoutCountry(JwtUtils jwtUtil) {
        when(jwtUtil.parse(NO_COUNTRY_TOKEN)).thenReturn(Optional.of(claimsWithCountry(null)));
    }

    static void givenTokenWithInvalidCountry(JwtUtils jwtUtil) {
        when(jwtUtil.parse(INVALID_COUNTRY_TOKEN)).thenReturn(Optional.of(claimsWithCountry("XX")));
    }

    private static Claims claimsWithCountry(String country) {
        var builder = Jwts.claims()
                .subject(Long.toString(ADMIN_ID))
                .add(JwtClaims.ROLES, List.of("ADMINISTRATOR"))
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz");
        if (country != null) builder.add(JwtClaims.COUNTRY, country);
        return builder.build();
    }

    static MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder builder) {
        return builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    private static void givenToken(JwtUtils jwtUtil, String token, long userId, List<String> roles) {
        var builder = Jwts.claims()
                .subject(Long.toString(userId))
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz")
                .add(JwtClaims.COUNTRY, "BO");
        builder.add(JwtClaims.ROLES, roles);
        when(jwtUtil.parse(token)).thenReturn(Optional.of(builder.build()));
    }
}
