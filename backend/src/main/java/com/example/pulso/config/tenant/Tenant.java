package com.example.pulso.config.tenant;

import java.time.ZoneId;

public record Tenant(
        Long clinicId,
        String clinicSlug,
        ZoneId zone
) {}
