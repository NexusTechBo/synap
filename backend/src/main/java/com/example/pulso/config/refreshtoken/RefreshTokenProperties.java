package com.example.pulso.config.refreshtoken;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "jwt.refresh")
public record RefreshTokenProperties(
        @NotNull @DefaultValue("7d")
        Duration ttl,
        @NotNull @DefaultValue("30d")
        Duration absoluteTtl,
        @NotBlank @DefaultValue("refresh_token")
        String cookieName,
        @DefaultValue("true")
        boolean cookieSecure,
        @NotBlank @DefaultValue("0 0 3 * * *")
        String cleanupCron
) {}
