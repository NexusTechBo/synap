package com.example.pulso.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.enums.ClinicLanguage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

@DisplayName("ClinicLanguageMapper")
class ClinicLanguageMapperTest {

    private final ClinicLanguageMapper mapper = new ClinicLanguageMapperImpl();

    @Test
    @DisplayName("languageToCode returns null for null")
    void languageToCodeNull() {
        assertThat(mapper.languageToCode(null)).isNull();
    }

    @ParameterizedTest
    @EnumSource(ClinicLanguage.class)
    @DisplayName("languageToCode returns the enum code")
    void languageToCodeAll(ClinicLanguage language) {
        assertThat(mapper.languageToCode(language)).isEqualTo(language.code());
    }
}
