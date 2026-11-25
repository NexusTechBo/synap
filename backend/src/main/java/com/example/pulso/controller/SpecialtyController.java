package com.example.pulso.controller;

import com.example.pulso.dto.specialty.SpecialtyRequest;
import com.example.pulso.dto.specialty.SpecialtyResponse;
import com.example.pulso.security.expression.RoleExpressions;
import com.example.pulso.service.SpecialtyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/specialties")
@RequiredArgsConstructor
@Tag(name = "Specialties", description = "Specialties Controller")
public class SpecialtyController {
    private final SpecialtyService specialtyService;

    @GetMapping
    @PreAuthorize(RoleExpressions.STAFF)
    @Operation(summary = "GET /api/specialties — list all available specialties")
    public ResponseEntity<List<SpecialtyResponse>> findAllSpecialties() {
        return ResponseEntity.ok(specialtyService.findAllSpecialties());
    }

    @PostMapping
    @PreAuthorize(RoleExpressions.ADMINISTRATOR)
    @Operation(summary = "POST /api/specialties — create a specialty (administrator only)")
    public ResponseEntity<SpecialtyResponse> createSpecialty(@Valid @RequestBody SpecialtyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(specialtyService.createSpecialty(request));
    }
}
