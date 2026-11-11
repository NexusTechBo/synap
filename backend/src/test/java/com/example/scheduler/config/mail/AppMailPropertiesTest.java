package com.example.scheduler.config.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class AppMailPropertiesTest {
    private static final String FROM = "no-reply@clinicflow.test";
    private static final String FROM_NAME = "ClinicFlow";
    private static final String BASE_URL = "https://api.brevo.com";
    private static final String API_KEY = "xkeysib-super-secret-key-123";

    @Test
    void shouldReportApiKeyWhenKeyIsPresent() {
        var properties = new AppMailProperties(FROM, FROM_NAME, BASE_URL, API_KEY);

        assertThat(properties.hasApiKey()).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldReportNoApiKeyWhenKeyIsBlank(String apiKey) {
        var properties = new AppMailProperties(FROM, FROM_NAME, BASE_URL, apiKey);

        assertThat(properties.hasApiKey()).isFalse();
    }

    @Test
    void shouldReportFromWhenFromIsPresent() {
        var properties = new AppMailProperties(FROM, FROM_NAME, BASE_URL, "");

        assertThat(properties.hasFrom()).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  "})
    void shouldReportNoFromWhenFromIsBlank(String from) {
        var properties = new AppMailProperties(from, FROM_NAME, BASE_URL, "");

        assertThat(properties.hasFrom()).isFalse();
    }
}
