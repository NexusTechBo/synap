package com.example.pulso.controller;

import static com.example.pulso.controller.SliceTokens.ADMIN_TOKEN;
import static com.example.pulso.controller.SliceTokens.ASSISTANT_TOKEN;
import static com.example.pulso.controller.SliceTokens.DOCTOR_TOKEN;
import static com.example.pulso.controller.SliceTokens.INVALID_COUNTRY_TOKEN;
import static com.example.pulso.controller.SliceTokens.NO_COUNTRY_TOKEN;
import static com.example.pulso.controller.SliceTokens.NO_TIMEZONE_TOKEN;
import static com.example.pulso.controller.SliceTokens.as;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsRequest;
import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.ClinicSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ClinicSettingsController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    ClinicSettingsControllerTest.SliceSecurityConfig.class
})
class ClinicSettingsControllerTest {
    private static final String URL = "/api/clinic/regional-settings";
    private static final String BODY = """
            {"country":"BR","timezone":"America/Manaus","defaultLanguage":"pt-BR"}
            """;

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ClinicSettingsService clinicSettingsService;

    @MockitoBean
    private JwtUtils jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    @BeforeEach
    void setUpTokens() {
        SliceTokens.givenStandardTokens(jwtUtil, activeUserChecker);
    }

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Nested
    class GetRegionalSettings {
        @Test
        void shouldReturnSettingsForAssistant() throws Exception {
            when(clinicSettingsService.getRegionalSettings())
                    .thenReturn(new ClinicRegionalSettingsResponse("BO", "America/La_Paz", "es"));

            mvc.perform(as(ASSISTANT_TOKEN, get(URL)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.country").value("BO"))
                    .andExpect(jsonPath("$.timezone").value("America/La_Paz"))
                    .andExpect(jsonPath("$.defaultLanguage").value("es"));
        }

        @Test
        void shouldReturnSettingsForDoctor() throws Exception {
            when(clinicSettingsService.getRegionalSettings())
                    .thenReturn(new ClinicRegionalSettingsResponse("BO", "America/La_Paz", "es"));

            mvc.perform(as(DOCTOR_TOKEN, get(URL))).andExpect(status().isOk());
        }

        @Test
        void shouldReturnUnauthorizedWhenTokenHasNoTimezoneClaim() throws Exception {
            SliceTokens.givenTokenWithoutTimezone(jwtUtil);

            mvc.perform(as(NO_TIMEZONE_TOKEN, get(URL))).andExpect(status().isUnauthorized());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnUnauthorizedWhenTokenHasNoCountryClaim() throws Exception {
            SliceTokens.givenTokenWithoutCountry(jwtUtil);

            mvc.perform(as(NO_COUNTRY_TOKEN, get(URL))).andExpect(status().isUnauthorized());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnUnauthorizedWhenTokenHasInvalidCountryClaim() throws Exception {
            SliceTokens.givenTokenWithInvalidCountry(jwtUtil);

            mvc.perform(as(INVALID_COUNTRY_TOKEN, get(URL))).andExpect(status().isUnauthorized());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnUnauthorizedWithoutToken() throws Exception {
            mvc.perform(get(URL)).andExpect(status().isUnauthorized());

            verifyNoInteractions(clinicSettingsService);
        }
    }

    @Nested
    class UpdateRegionalSettings {
        @Test
        void shouldReturnNoContentForAdministrator() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, put(URL)).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isNoContent());

            verify(clinicSettingsService)
                    .updateRegionalSettings(new ClinicRegionalSettingsRequest("BR", "America/Manaus", "pt-BR"));
        }

        @Test
        void shouldReturnForbiddenForDoctor() throws Exception {
            mvc.perform(as(DOCTOR_TOKEN, put(URL)).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnForbiddenForAssistant() throws Exception {
            mvc.perform(as(ASSISTANT_TOKEN, put(URL)).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnUnauthorizedWithoutToken() throws Exception {
            mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnBadRequestWhenFieldsAreBlank() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, put(URL))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"country\":\"\",\"timezone\":\"  \",\"defaultLanguage\":null}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.length()").value(3));

            verifyNoInteractions(clinicSettingsService);
        }

        @Test
        void shouldReturnSpanishBadRequestWhenServiceRejectsCountry() throws Exception {
            doThrow(new BadRequestException(MessageKeys.REGION_COUNTRY_UNSUPPORTED, "AR"))
                    .when(clinicSettingsService).updateRegionalSettings(any());

            mvc.perform(as(ADMIN_TOKEN, put(URL)).contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("País no soportado: AR"));
        }

        @Test
        void shouldReturnEnglishBadRequestWhenAcceptLanguageIsEnglish() throws Exception {
            doThrow(new BadRequestException(MessageKeys.REGION_TIMEZONE_INVALID, "America/La_Paz", "BR"))
                    .when(clinicSettingsService).updateRegionalSettings(any());

            mvc.perform(as(ADMIN_TOKEN, put(URL))
                            .header("Accept-Language", "en")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(BODY))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("The time zone America/La_Paz is not valid for country BR"));
        }
    }
}
