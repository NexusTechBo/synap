package com.example.pulso.controller;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.security.RoleExpressions;
import com.example.pulso.service.ClinicSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clinic/regional-settings")
@RequiredArgsConstructor
@Tag(name = "Workspace settings", description = "Regional settings of the current workspace")
public class ClinicSettingsController {
    private final ClinicSettingsService clinicSettingsService;

    @GetMapping
    @PreAuthorize(RoleExpressions.STAFF)
    @Operation(summary = "Get the country, time zone and default language of the current workspace")
    public ResponseEntity<ClinicRegionalSettingsResponse> getRegionalSettings() {
        return ResponseEntity.ok(clinicSettingsService.getRegionalSettings());
    }

    @PutMapping
    @PreAuthorize(RoleExpressions.ADMINISTRATOR)
    @Operation(summary = "Update the regional settings of the current workspace (administrator only)")
    public ResponseEntity<ClinicRegionalSettingsResponse> updateRegionalSettings(
            @Valid @RequestBody ClinicRegionalSettingsRequest request) {
        return ResponseEntity.ok(clinicSettingsService.updateRegionalSettings(request));
    }
}
