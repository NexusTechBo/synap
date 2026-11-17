package com.example.pulso.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.service.component.resolver.RegionalSettingsResolver;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class RegionalSettingsResolverTest {
    private final RegionalSettingsResolver resolver = new RegionalSettingsResolver();

    @Nested
    class ResolveWithDefaults {
        @Test
        void shouldDefaultToBoliviaWhenEverythingIsNull() {
            var result = resolver.resolveWithDefaults(null, null, null);

            assertThat(result.country()).isEqualTo(SupportedCountry.BO);
            assertThat(result.timezone()).isEqualTo("America/La_Paz");
            assertThat(result.language()).isEqualTo(ClinicLanguage.ES);
        }

        @Test
        void shouldTreatBlankValuesAsOmitted() {
            var result = resolver.resolveWithDefaults("  ", " ", "");

            assertThat(result.country()).isEqualTo(SupportedCountry.BO);
            assertThat(result.timezone()).isEqualTo("America/La_Paz");
            assertThat(result.language()).isEqualTo(ClinicLanguage.ES);
        }

        @Test
        void shouldUseBrazilDefaultsWhenOnlyCountryIsGiven() {
            var result = resolver.resolveWithDefaults("BR", null, null);

            assertThat(result.country()).isEqualTo(SupportedCountry.BR);
            assertThat(result.timezone()).isEqualTo("America/Sao_Paulo");
            assertThat(result.language()).isEqualTo(ClinicLanguage.PT_BR);
        }

        @Test
        void shouldKeepExplicitBrazilTimezone() {
            var result = resolver.resolveWithDefaults("BR", "America/Manaus", null);

            assertThat(result.timezone()).isEqualTo("America/Manaus");
            assertThat(result.language()).isEqualTo(ClinicLanguage.PT_BR);
        }

        @Test
        void shouldKeepExplicitLanguageOverCountryDefault() {
            var result = resolver.resolveWithDefaults("BR", null, "en");

            assertThat(result.language()).isEqualTo(ClinicLanguage.EN);
        }

        @Test
        void shouldNormalizeLowercaseAndPaddedCountry() {
            var result = resolver.resolveWithDefaults(" br ", null, null);

            assertThat(result.country()).isEqualTo(SupportedCountry.BR);
        }

        @Test
        void shouldRejectUnsupportedCountry() {
            var ex = catchThrowableOfType(BadRequestException.class, () -> resolver.resolveWithDefaults("AR", null, null));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_COUNTRY_UNSUPPORTED);
            assertThat(ex.getArgs()).containsExactly("AR");
        }

        @Test
        void shouldRejectNonexistentTimezone() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveWithDefaults("BO", "Mars/Olympus", null));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
            assertThat(ex.getArgs()).containsExactly("Mars/Olympus", "BO");
        }

        @Test
        void shouldRejectTimezoneFromAnotherCountry() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveWithDefaults("BR", "America/La_Paz", null));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
            assertThat(ex.getArgs()).containsExactly("America/La_Paz", "BR");
        }

        @Test
        void shouldRejectUnsupportedLanguage() {
            var ex = catchThrowableOfType(BadRequestException.class, () -> resolver.resolveWithDefaults("BO", null, "fr"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_LANGUAGE_UNSUPPORTED);
            assertThat(ex.getArgs()).containsExactly("fr");
        }
    }

    @Nested
    class ResolveStrict {
        @Test
        void shouldReturnSettingsWhenAllValuesAreValid() {
            var result = resolver.resolveStrict("BR", "America/Manaus", "pt-BR");

            assertThat(result.country()).isEqualTo(SupportedCountry.BR);
            assertThat(result.timezone()).isEqualTo("America/Manaus");
            assertThat(result.language()).isEqualTo(ClinicLanguage.PT_BR);
        }

        @Test
        void shouldNormalizeCountryCase() {
            assertThat(resolver.resolveStrict("bo", "America/La_Paz", "es").country()).isEqualTo(SupportedCountry.BO);
        }

        @Test
        void shouldRejectUnsupportedCountry() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveStrict("XX", "America/La_Paz", "es"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_COUNTRY_UNSUPPORTED);
        }

        @Test
        void shouldRejectNullCountry() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveStrict(null, "America/La_Paz", "es"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_COUNTRY_UNSUPPORTED);
        }

        @Test
        void shouldRejectNullTimezone() {
            var ex = catchThrowableOfType(BadRequestException.class, () -> resolver.resolveStrict("BO", null, "es"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
        }

        @Test
        void shouldRejectTimezoneOfAnotherCountry() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveStrict("BR", "America/La_Paz", "pt-BR"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_TIMEZONE_INVALID);
        }

        @Test
        void shouldRejectUnsupportedLanguage() {
            var ex = catchThrowableOfType(
                    BadRequestException.class, () -> resolver.resolveStrict("BO", "America/La_Paz", "PT-br"));

            assertThat(ex.getMessageKey()).isEqualTo(MessageKeys.REGION_LANGUAGE_UNSUPPORTED);
        }
    }
}
