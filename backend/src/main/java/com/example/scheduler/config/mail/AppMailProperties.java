package com.example.scheduler.config.mail;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.mail")
public record AppMailProperties(
        @DefaultValue("")
        String from,
        @DefaultValue("")
        String fromName,
        @NotBlank @DefaultValue("https://api.brevo.com")
        String baseUrl,
        @DefaultValue("")
        String apiKey
) {

    public boolean hasFrom() {
        return StringUtils.hasText(from);
    }

    public boolean hasApiKey() {
        return StringUtils.hasText(apiKey);
    }
}
