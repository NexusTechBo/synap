package com.example.pulso.dto.region;

import java.util.List;

public record CountryResponse(
        String code,
        String defaultTimezone,
        List<String> timezones,
        String defaultLanguage,
        String phonePlaceholder
) {}
