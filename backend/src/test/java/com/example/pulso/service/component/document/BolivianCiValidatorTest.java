package com.example.pulso.service.component.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class BolivianCiValidatorTest {
    private final BolivianCiValidator validator = new BolivianCiValidator();

    @Test
    void shouldBeRegisteredForBolivia() {
        assertThat(validator.country()).isEqualTo(SupportedCountry.BO);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345", "123456", "1234567890"})
    void shouldAcceptBetweenFiveAndTenDigits(String raw) {
        assertThat(validator.validateAndNormalize(raw)).isEqualTo(raw);
    }

    @Test
    void shouldStripSurroundingWhitespace() {
        assertThat(validator.validateAndNormalize(" 123456 ")).isEqualTo("123456");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1234", "12345678901", "12a456", "12 345", "-12345", "52998224725", "529.982.247-25", "", "   "})
    void shouldRejectInvalidCi(String raw) {
        var thrown = catchThrowable(() -> validator.validateAndNormalize(raw));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID);
    }
}
