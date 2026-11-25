package com.example.pulso.service.component.resolver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.i18n.LocaleContextHolder;

@ExtendWith(MockitoExtension.class)
class ClinicLocaleResolverTest {
    private static final Locale SPANISH = Locale.forLanguageTag("es");
    private static final Locale PORTUGUESE_BRAZIL = Locale.forLanguageTag("pt-BR");

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    private ClinicLocaleResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ClinicLocaleResolver(currentClinicProvider);
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
    }

    private Clinic clinic(ClinicLanguage language) {
        return Clinic.builder().name("Demo").slug("demo").defaultLanguage(language).build();
    }

    @Nested
    class Resolve {
        @Test
        void shouldReturnEnglishWhenClinicLanguageIsEnglish() {
            assertThat(resolver.resolve(clinic(ClinicLanguage.EN))).isEqualTo(Locale.ENGLISH);
        }

        @Test
        void shouldReturnSpanishWhenClinicLanguageIsSpanish() {
            assertThat(resolver.resolve(clinic(ClinicLanguage.ES))).isEqualTo(SPANISH);
        }

        @Test
        void shouldReturnPortugueseWhenClinicLanguageIsPortuguese() {
            assertThat(resolver.resolve(clinic(ClinicLanguage.PT_BR))).isEqualTo(PORTUGUESE_BRAZIL);
        }
    }

    @Nested
    class ResolveCurrent {
        @Test
        void shouldUseCurrentClinicLanguage() {
            when(currentClinicProvider.getCurrentClinic()).thenReturn(clinic(ClinicLanguage.EN));

            assertThat(resolver.resolveCurrent()).isEqualTo(Locale.ENGLISH);
        }

        @Test
        void shouldReturnPortugueseForCurrentClinic() {
            when(currentClinicProvider.getCurrentClinic()).thenReturn(clinic(ClinicLanguage.PT_BR));

            assertThat(resolver.resolveCurrent()).isEqualTo(PORTUGUESE_BRAZIL);
        }

        @Test
        void shouldIgnoreRequestLocale() {
            LocaleContextHolder.setLocale(Locale.ENGLISH);
            when(currentClinicProvider.getCurrentClinic()).thenReturn(clinic(ClinicLanguage.ES));

            assertThat(resolver.resolveCurrent()).isEqualTo(SPANISH);
        }
    }
}