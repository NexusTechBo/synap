package com.example.pulso.controller;

import com.example.pulso.dto.login.AuthSession;
import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.login.LoginResponse;
import com.example.pulso.dto.personal.PersonalResponse;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.security.cookie.RefreshTokenCookie;
import com.example.pulso.security.expression.RoleExpressions;
import com.example.pulso.security.util.SecurityUtils;
import com.example.pulso.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Auth Controller")
public class AuthController {
    private final AuthService authService;
    private final RefreshTokenCookie refreshTokenCookie;

    @PostMapping("/login")
    @Operation(summary = "POST /api/auth/login — authenticate an user and return a short-lived JWT token; the refresh token is set as an HttpOnly cookie")
    public ResponseEntity<LoginResponse> loginPersonal(@Valid @RequestBody LoginRequest request) {
        return withRefreshCookie(authService.login(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "POST /api/auth/refresh — rotate the refresh token cookie and return a new JWT token with the current claims")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            return withRefreshCookie(authService.refresh(refreshTokenCookie.read(request).orElse(null)));
        } catch (UnauthorizedException e) {
            response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.clear());
            throw e;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "POST /api/auth/logout — revoke the session of the refresh token cookie and clear it")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(refreshTokenCookie.read(request).orElse(null));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.clear())
                .build();
    }

    @GetMapping("/me")
    @PreAuthorize(RoleExpressions.STAFF)
    @Operation(summary = "GET /api/auth/me — profile of the authenticated user")
    public ResponseEntity<PersonalResponse> findProfile(Authentication auth) {
        return ResponseEntity.ok(authService.findProfile(SecurityUtils.extractUserId(auth)));
    }

    private ResponseEntity<LoginResponse> withRefreshCookie(AuthSession session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.issue(session.refreshToken()))
                .body(new LoginResponse(session.accessToken()));
    }
}
