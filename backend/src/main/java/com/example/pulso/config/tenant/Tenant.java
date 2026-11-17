package com.example.pulso.config.tenant;

import com.example.pulso.enums.SupportedCountry;
import java.time.ZoneId;

public record Tenant(
        Long clinicId,
        String clinicSlug,
        ZoneId zone,
        SupportedCountry country
) {}
