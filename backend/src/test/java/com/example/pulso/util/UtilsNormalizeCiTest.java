package com.example.pulso.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class UtilsNormalizeCiTest {
    @Test
    void shouldReturnNullWhenCiIsNull() {
        assertThat(Utils.normalizeCi(null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "   ", "\t"})
    void shouldReturnNullWhenCiIsBlank(String ci) {
        assertThat(Utils.normalizeCi(ci)).isNull();
    }

    @Test
    void shouldStripSurroundingWhitespace() {
        assertThat(Utils.normalizeCi(" 123456 ")).isEqualTo("123456");
    }

    @Test
    void shouldKeepCiWithoutWhitespaceUnchanged() {
        assertThat(Utils.normalizeCi("12345")).isEqualTo("12345");
    }
}
