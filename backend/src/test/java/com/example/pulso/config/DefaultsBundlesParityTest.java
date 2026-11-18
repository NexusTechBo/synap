package com.example.pulso.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DefaultsBundlesParityTest {
    private static final String ENGLISH = "defaults.properties";
    private static final String SPANISH = "defaults_es.properties";

    @Test
    void shouldDefineSameKeysInBothBundles() throws IOException {
        assertThat(load(SPANISH).stringPropertyNames())
                .containsExactlyInAnyOrderElementsOf(load(ENGLISH).stringPropertyNames());
    }

    @ParameterizedTest
    @ValueSource(strings = {ENGLISH, SPANISH})
    void shouldDefineDefaultSpecialtyNameWithoutBlankValues(String bundle) throws IOException {
        var properties = load(bundle);

        assertThat(properties).containsKey("specialty.defaultGeneralMedicine");
        assertThat(properties.stringPropertyNames())
                .allSatisfy(key -> assertThat(properties.getProperty(key)).as("%s in %s", key, bundle).isNotBlank());
    }

    private static Properties load(String bundle) throws IOException {
        var properties = new Properties();
        try (var in = DefaultsBundlesParityTest.class.getClassLoader().getResourceAsStream(bundle)) {
            assertThat(in).as(bundle).isNotNull();
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}
