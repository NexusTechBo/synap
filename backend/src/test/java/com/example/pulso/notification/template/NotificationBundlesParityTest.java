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

    @Test
    void shouldDefineEveryEnglishKeyInSpanishBundle() throws IOException {
        assertThat(load(SPANISH).stringPropertyNames()).containsAll(load(ENGLISH).stringPropertyNames());
    }

    @Test
    void shouldDefineEverySpanishKeyInEnglishBundle() throws IOException {
        assertThat(load(ENGLISH).stringPropertyNames()).containsAll(load(SPANISH).stringPropertyNames());
    }

    @Test
    void shouldNotHaveBlankValuesInEitherBundle() throws IOException {
        for (var bundle : new String[] {ENGLISH, SPANISH}) {
            var properties = load(bundle);
            assertThat(properties.stringPropertyNames())
                    .allSatisfy(key -> assertThat(properties.getProperty(key))
                            .as("%s in %s", key, bundle)
                            .isNotBlank());
        }
    }

    @Test
    void shouldUseSamePlaceholdersInBothBundles() throws IOException {
        var english = load(ENGLISH);
        var spanish = load(SPANISH);

        assertThat(english.stringPropertyNames()).allSatisfy(key -> assertThat(placeholders(spanish.getProperty(key)))
                .as(key)
                .isEqualTo(placeholders(english.getProperty(key))));
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
