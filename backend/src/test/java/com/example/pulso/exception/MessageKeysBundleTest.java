package com.example.pulso.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MessageKeysBundleTest {
    private static final String ENGLISH = "messages.properties";
    private static final String SPANISH = "messages_es.properties";
    private static final String PORTUGUESE_BRAZIL = "messages_pt_BR.properties";

    @ParameterizedTest
    @ValueSource(strings = {ENGLISH, SPANISH, PORTUGUESE_BRAZIL})
    void shouldContainEveryMessageKeyWhenBundleIsLoaded(String bundle) throws IOException {
        var properties = load(bundle);

        assertThat(messageKeys())
                .allSatisfy(key ->
                        assertThat(properties).as("%s in %s", key, bundle).containsKey(key));
    }

    @Test
    void shouldHaveExactBidirectionalKeyParityAcrossAllBundles() throws IOException {
        var englishKeys = load(ENGLISH).stringPropertyNames();

        for (var bundle : new String[] {SPANISH, PORTUGUESE_BRAZIL}) {
            var targetKeys = load(bundle).stringPropertyNames();
            assertThat(targetKeys)
                    .as("Missing keys in %s compared to %s", bundle, ENGLISH)
                    .containsAll(englishKeys);
            assertThat(englishKeys)
                    .as("Extra keys in %s not present in %s", bundle, ENGLISH)
                    .containsAll(targetKeys);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {ENGLISH, SPANISH, PORTUGUESE_BRAZIL})
    void shouldNotHaveBlankValuesInAnyBundle(String bundle) throws IOException {
        var properties = load(bundle);

        assertThat(properties.stringPropertyNames())
                .allSatisfy(key -> assertThat(properties.getProperty(key))
                        .as("%s in %s", key, bundle)
                        .isNotBlank());
    }

    private static List<String> messageKeys() {
        return Arrays.stream(MessageKeys.class.getDeclaredFields())
                .filter(f -> Modifier.isStatic(f.getModifiers()) && f.getType() == String.class)
                .map(MessageKeysBundleTest::value)
                .toList();
    }

    private static String value(Field field) {
        try {
            return (String) field.get(null);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Properties load(String bundle) throws IOException {
        var properties = new Properties();
        try (var in = MessageKeysBundleTest.class.getClassLoader().getResourceAsStream(bundle)) {
            assertThat(in).as(bundle).isNotNull();
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}