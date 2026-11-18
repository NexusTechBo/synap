package com.example.pulso.controller;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.dto.login.LoginResponse;
import com.example.pulso.security.RoleExpressions;
import com.example.pulso.security.SecurityUtils;
import com.example.pulso.service.AuthService;
import com.example.pulso.service.ClinicSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clinic/regional-settings")
@RequiredArgsConstructor
@Tag(name = "Workspace settings", description = "Regional settings of the current workspace")
public class ClinicSettingsController {
    private final ClinicSettingsService clinicSettingsService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize(RoleExpressions.STAFF)
    @Operation(summary = "Get the country, time zone and default language of the current workspace")
    public ResponseEntity<ClinicRegionalSettingsResponse> getRegionalSettings() {
        return ResponseEntity.ok(clinicSettingsService.getRegionalSettings());
    }

    @PutMapping
    @PreAuthorize(RoleExpressions.ADMINISTRATOR)
    @Operation(summary = "Update the regional settings of the current workspace (administrator only); returns a new token carrying the updated country, time zone and language")
    public ResponseEntity<LoginResponse> updateRegionalSettings(
            @Valid @RequestBody ClinicRegionalSettingsRequest request,
            Authentication auth) {
        clinicSettingsService.updateRegionalSettings(request);
        return ResponseEntity.ok(authService.issueToken(SecurityUtils.extractUserId(auth)));
    }
}
