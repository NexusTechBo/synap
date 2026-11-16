package com.example.pulso.controller;

import com.example.pulso.dto.clinic.ActivateClinicRequest;
import com.example.pulso.dto.clinic.ClinicActivatedResponse;
import com.example.pulso.dto.clinic.ClinicCreatedResponse;
import com.example.pulso.dto.clinic.ClinicRequest;
import com.example.pulso.dto.clinic.ResendActivationRequest;
import com.example.pulso.service.ClinicActivationService;
import com.example.pulso.service.ClinicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
@Tag(name = "Workspaces", description = "Workspaces Controller")
public class ClinicController {
    private final ClinicService clinicService;
    private final ClinicActivationService clinicActivationService;

    @PostMapping
    @Operation(summary = "Register a new workspace and create its administrator account; sends the activation email (public)")
    public ResponseEntity<ClinicCreatedResponse> createClinic(@Valid @RequestBody ClinicRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clinicService.createClinic(request));
    }

    @PostMapping("/activate")
    @Operation(summary = "Activate a workspace with the token received by email (public)")
    public ResponseEntity<ClinicActivatedResponse> activateClinic(@Valid @RequestBody ActivateClinicRequest request) {
        return ResponseEntity.ok(clinicActivationService.activateClinic(request));
    }

    @PostMapping("/activation/resend")
    @Operation(summary = "Resend the activation email of a pending workspace; always 202 (public)")
    public ResponseEntity<Void> resendActivation(@Valid @RequestBody ResendActivationRequest request) {
        clinicActivationService.resendActivation(request);
        return ResponseEntity.accepted().build();
    }
}
