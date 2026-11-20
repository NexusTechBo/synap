package com.example.pulso.notification.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.TreeSet;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class NotificationBundlesParityTest {
    private static final String ENGLISH = "notifications.properties";
    private static final String SPANISH = "notifications_es.properties";
    private static final String PORTUGUESE_BRAZIL = "notifications_pt_BR.properties";

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

    @Test
    void shouldUseSamePlaceholdersInAllBundles() throws IOException {
        var english = load(ENGLISH);

        for (var bundle : new String[] {SPANISH, PORTUGUESE_BRAZIL}) {
            var target = load(bundle);
            assertThat(english.stringPropertyNames()).allSatisfy(key -> assertThat(placeholders(target.getProperty(key)))
                    .as("%s in %s", key, bundle)
                    .isEqualTo(placeholders(english.getProperty(key))));
        }
    }

    private static String placeholders(String value) {
        var matcher = Pattern.compile("\\{\\d+}").matcher(value);
        var found = new TreeSet<String>();
        while (matcher.find()) found.add(matcher.group());
        return String.join(",", found);
    }

    private static Properties load(String bundle) throws IOException {
        var properties = new Properties();
        try (var in = NotificationBundlesParityTest.class.getClassLoader().getResourceAsStream(bundle)) {
            assertThat(in).as(bundle).isNotNull();
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}