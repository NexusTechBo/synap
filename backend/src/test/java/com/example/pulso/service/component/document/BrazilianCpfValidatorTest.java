package com.example.pulso.service.component.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class BrazilianCpfValidatorTest {
    private final BrazilianCpfValidator validator = new BrazilianCpfValidator();

    @Test
    void shouldBeRegisteredForBrazil() {
        assertThat(validator.country()).isEqualTo(SupportedCountry.BR);
    }

    @ParameterizedTest
    @ValueSource(strings = {"529.982.247-25", "52998224725", " 529 982 247 25 ", "529.982.247.25"})
    void shouldStoreDigitsOnlyWhenCpfIsValid(String raw) {
        assertThat(validator.validateAndNormalize(raw)).isEqualTo("52998224725");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "52998224724",
            "52998224715",
            "00000000000",
            "11111111111",
            "99999999999",
            "5299822472",
            "529982247255",
            "5299822472a",
            "abcdefghijk",
            "",
            "   "
    })
    void shouldRejectInvalidCpf(String raw) {
        var thrown = catchThrowable(() -> validator.validateAndNormalize(raw));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
    }
}
