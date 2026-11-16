package com.example.pulso.controller;

import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.login.LoginResponse;
import com.example.pulso.dto.personal.PersonalResponse;
import com.example.pulso.security.RoleExpressions;
import com.example.pulso.security.SecurityUtils;
import com.example.pulso.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Auth Controller")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "POST /api/auth/login — authenticate an user and return a JWT token")
    public ResponseEntity<LoginResponse> loginPersonal(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @PreAuthorize(RoleExpressions.STAFF)
    @Operation(summary = "GET /api/auth/me — profile of the authenticated user")
    public ResponseEntity<PersonalResponse> findProfile(Authentication auth) {
        return ResponseEntity.ok(authService.findProfile(SecurityUtils.extractUserId(auth)));
    }
}
