package com.example.pulso.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class UtilsMaskPhoneTest {
    @Test
    void shouldKeepOnlyLastFourCharacters() {
        assertThat(Utils.maskPhone("+59171234567")).isEqualTo("***4567");
    }

    @Test
    void shouldKeepWholeValueWhenShorterThanVisibleLength() {
        assertThat(Utils.maskPhone("123")).isEqualTo("***123");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" "})
    void shouldReturnNoneWhenBlank(String phone) {
        assertThat(Utils.maskPhone(phone)).isEqualTo("none");
    }
}
