package com.example.pulso.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class UtilsAddLeadingPlusTest {
    @Test
    void shouldPrefixDigitsWithPlus() {
        assertThat(Utils.addLeadingPlus("59170000020")).isEqualTo("+59170000020");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldReturnNullWhenBlank(String digits) {
        assertThat(Utils.addLeadingPlus(digits)).isNull();
    }
}
