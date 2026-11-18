package com.example.pulso.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class UtilsStripDocumentSeparatorsTest {
    @ParameterizedTest
    @CsvSource({
            "529.982.247-25, 52998224725",
            "529 982 247 25, 52998224725",
            "529.982 247-25, 52998224725",
            "12-34.5, 12345"
    })
    void shouldRemoveDotsHyphensAndSpaces(String raw, String expected) {
        assertThat(Utils.stripDocumentSeparators(raw)).isEqualTo(expected);
    }

    @Test
    void shouldKeepTermWithoutSeparatorsUnchanged() {
        assertThat(Utils.stripDocumentSeparators("52998224725")).isEqualTo("52998224725");
        assertThat(Utils.stripDocumentSeparators("ana")).isEqualTo("ana");
    }

    @Test
    void shouldReturnEmptyForEmptyInput() {
        assertThat(Utils.stripDocumentSeparators("")).isEmpty();
    }
}
