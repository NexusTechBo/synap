package com.example.pulso.service.component.resolver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.service.component.document.BolivianCiValidator;
import com.example.pulso.service.component.document.BrazilianCpfValidator;
import com.example.pulso.service.component.document.DocumentValidator;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class IdentityDocumentResolverTest {
    private final IdentityDocumentResolver resolver =
            new IdentityDocumentResolver(List.of(new BolivianCiValidator(), new BrazilianCpfValidator()));

    @Nested
    class Construction {
        @Test
        void shouldFailWhenCountryHasDuplicateValidators() {
            List<DocumentValidator> validators = List.of(new BolivianCiValidator(), new BolivianCiValidator(), new BrazilianCpfValidator());

            assertThatThrownBy(() -> new IdentityDocumentResolver(validators))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("BO");
        }

        @Test
        void shouldFailWhenCountryHasNoValidator() {
            List<DocumentValidator> validators = List.of(new BolivianCiValidator());

            assertThatThrownBy(() -> new IdentityDocumentResolver(validators))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("BR");
        }

        @Test
        void shouldFailWhenNoValidatorsAreRegistered() {
            assertThatThrownBy(() -> new IdentityDocumentResolver(List.of()))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class ValidateAndNormalize {
        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {" ", "   ", "\t"})
        void shouldReturnNullWhenBlank(String raw) {
            assertThat(resolver.validateAndNormalize(raw, SupportedCountry.BR)).isNull();
            assertThat(resolver.validateAndNormalize(raw, SupportedCountry.BO)).isNull();
        }

        @Test
        void shouldRouteToBolivianValidatorForBolivia() {
            assertThat(resolver.validateAndNormalize("1234567", SupportedCountry.BO)).isEqualTo("1234567");
        }

        @Test
        void shouldRouteToBrazilianValidatorForBrazil() {
            assertThat(resolver.validateAndNormalize("529.982.247-25", SupportedCountry.BR)).isEqualTo("52998224725");
        }

        @Test
        void shouldRejectCpfAsCiForBolivia() {
            var thrown = catchThrowable(() -> resolver.validateAndNormalize("529.982.247-25", SupportedCountry.BO));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID);
        }

        @Test
        void shouldRejectCiAsCpfForBrazil() {
            var thrown = catchThrowable(() -> resolver.validateAndNormalize("1234567", SupportedCountry.BR));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        }
    }

    @Nested
    class ValidateAndNormalizeUnlessUnchanged {
        @Test
        void shouldKeepStoredDocumentWhenRawEqualsStoredEvenIfInvalidForCountry() {
            assertThat(resolver.validateAndNormalizeUnlessUnchanged("12345", SupportedCountry.BR, "12345"))
                    .isEqualTo("12345");
        }

        @Test
        void shouldKeepStoredDocumentWhenRawHasSurroundingWhitespace() {
            assertThat(resolver.validateAndNormalizeUnlessUnchanged(" 12345 ", SupportedCountry.BR, "12345"))
                    .isEqualTo("12345");
        }

        @Test
        void shouldNormalizeWhenRawDiffersFromStored() {
            assertThat(resolver.validateAndNormalizeUnlessUnchanged("529.982.247-25", SupportedCountry.BR, "12345"))
                    .isEqualTo("52998224725");
        }

        @Test
        void shouldRejectWhenRawDiffersFromStoredAndIsInvalid() {
            var thrown = catchThrowable(
                    () -> resolver.validateAndNormalizeUnlessUnchanged("52998224724", SupportedCountry.BR, "12345"));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((BadRequestException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        }

        @Test
        void shouldReturnNullWhenRawIsBlank() {
            assertThat(resolver.validateAndNormalizeUnlessUnchanged("  ", SupportedCountry.BO, "12345")).isNull();
        }

        @Test
        void shouldValidateWhenNothingIsStored() {
            assertThat(resolver.validateAndNormalizeUnlessUnchanged("12345", SupportedCountry.BO, null))
                    .isEqualTo("12345");
        }
    }
}
