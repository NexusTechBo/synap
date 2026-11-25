package com.example.pulso.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;

class DefaultBundlesParityTest {
    private static final String ENGLISH = "defaults.properties";
    private static final String SPANISH = "defaults_es.properties";
    private static final String PORTUGUESE_BRAZIL = "defaults_pt_BR.properties";

    @Test
    void shouldDefineEveryEnglishKeyInAllBundles() throws IOException {
        var englishKeys = load(ENGLISH).stringPropertyNames();
        for (var bundle : new String[] {SPANISH, PORTUGUESE_BRAZIL}) {
            assertThat(load(bundle).stringPropertyNames())
                    .as("Missing English keys in %s", bundle)
                    .containsAll(englishKeys);
        }
    }

    @Test
    void shouldNotHaveExtraKeysInTranslatedBundles() throws IOException {
        var englishKeys = load(ENGLISH).stringPropertyNames();
        for (var bundle : new String[] {SPANISH, PORTUGUESE_BRAZIL}) {
            assertThat(englishKeys)
                    .as("Extra keys in %s not present in %s", bundle, ENGLISH)
                    .containsAll(load(bundle).stringPropertyNames());
        }
    }

    @Test
    void shouldNotHaveBlankValuesInAnyBundle() throws IOException {
        for (var bundle : new String[] {ENGLISH, SPANISH, PORTUGUESE_BRAZIL}) {
            var properties = load(bundle);
            assertThat(properties.stringPropertyNames())
                    .allSatisfy(key -> assertThat(properties.getProperty(key))
                            .as("%s in %s", key, bundle)
                            .isNotBlank());
        }
    }

    private static Properties load(String bundle) throws IOException {
        var properties = new Properties();
        try (var in = DefaultBundlesParityTest.class.getClassLoader().getResourceAsStream(bundle)) {
            assertThat(in).as(bundle).isNotNull();
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}