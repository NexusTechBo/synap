package com.example.pulso.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class UtilsNormalizePhoneNumberTest {
    @Test
    void shouldNormalizeBrazilianMobileToE164() {
        assertThat(Utils.normalizePhoneNumber("11 91234-5678", SupportedCountry.BR)).isEqualTo("+5511912345678");
    }

    @Test
    void shouldNormalizeBolivianMobileToE164() {
        assertThat(Utils.normalizePhoneNumber("70000020", SupportedCountry.BO)).isEqualTo("+59170000020");
    }

    @Test
    void shouldKeepInternationalNumberRegardlessOfRegion() {
        assertThat(Utils.normalizePhoneNumber("+59170000020", SupportedCountry.BR)).isEqualTo("+59170000020");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void shouldReturnNullWhenBlank(String phone) {
        assertThat(Utils.normalizePhoneNumber(phone, SupportedCountry.BO)).isNull();
    }

    @Test
    void shouldReturnNullWhenNull() {
        assertThat(Utils.normalizePhoneNumber(null, SupportedCountry.BR)).isNull();
    }

    @Test
    void shouldRejectBolivianNumberWhenRegionIsBrazil() {
        var thrown = catchThrowable(() -> Utils.normalizePhoneNumber("70000020", SupportedCountry.BR));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_PHONE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"123", "abc", "0000000000000000"})
    void shouldRejectInvalidNumber(String phone) {
        var thrown = catchThrowable(() -> Utils.normalizePhoneNumber(phone, SupportedCountry.BO));

        assertThat(thrown).isInstanceOf(BadRequestException.class);
        assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_PHONE_INVALID);
    }
}
