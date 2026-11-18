package com.example.pulso.dto.region;

import java.util.List;

public record RegionCatalogResponse(
        List<CountryResponse> countries,
        List<String> languages
) {}
