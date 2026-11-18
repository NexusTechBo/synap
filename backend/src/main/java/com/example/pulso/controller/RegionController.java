package com.example.pulso.controller;

import com.example.pulso.dto.region.RegionCatalogResponse;
import com.example.pulso.service.RegionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/regions")
@RequiredArgsConstructor
@Tag(name = "Regions", description = "Supported countries, time zones and languages")
public class RegionController {
    private final RegionService regionService;

    @GetMapping
    @Operation(summary = "List supported countries, time zones and languages (public)")
    public ResponseEntity<RegionCatalogResponse> getCatalog() {
        return ResponseEntity.ok(regionService.getCatalog());
    }
}
