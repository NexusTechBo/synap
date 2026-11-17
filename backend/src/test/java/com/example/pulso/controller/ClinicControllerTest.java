package com.example.pulso.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.dto.clinic.ClinicCreatedResponse;
import com.example.pulso.dto.clinic.ClinicRequest;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.service.ClinicActivationService;
import com.example.pulso.service.ClinicService;
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

@WebMvcTest(controllers = ClinicController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    ClinicControllerTest.SliceSecurityConfig.class
})
class ClinicControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ClinicService clinicService;

    @MockitoBean
    private ClinicActivationService clinicActivationService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    private static String body(String adminDocument) {
        return """
                {"name":"Clinica Demo","slug":"demo","phoneNumber":"70000000","adminName":"Admin Demo",
                 "adminUsername":"admin","adminEmail":"admin@mail.test","adminPassword":"secret123","adminDocument":"%s"}
                """.formatted(adminDocument);
    }

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Nested
    class CreateClinic {
        @Test
        void shouldReturnLocalizedBadRequestWhenServiceRejectsDocument() throws Exception {
            when(clinicService.createClinic(any()))
                    .thenThrow(new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID));

            mvc.perform(post("/api/clinics").contentType(MediaType.APPLICATION_JSON).content(body("1234")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID))
                    .andExpect(jsonPath("$.message").value("El CPF debe tener 11 dígitos y un dígito verificador válido"));
        }

        @Test
        void shouldReturnBadRequestWithDocumentFieldErrorWhenDocumentExceedsTwentyCharacters() throws Exception {
            mvc.perform(post("/api/clinics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("1".repeat(21))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors", hasSize(1)))
                    .andExpect(jsonPath("$.errors[0].field").value("adminDocument"));

            verifyNoInteractions(clinicService);
        }

        @Test
        void shouldReturnCreatedWhenAdminCiIsValid() throws Exception {
            when(clinicService.createClinic(any()))
                    .thenReturn(new ClinicCreatedResponse(
                            7L,
                            "Clinica Demo",
                            "70000000",
                            "demo",
                            1L,
                            "admin",
                            "admin@mail.test"
                    ));

            mvc.perform(post("/api/clinics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("12345")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(7))
                    .andExpect(jsonPath("$.slug").value("demo"));

            verify(clinicService).createClinic(new ClinicRequest(
                    "Clinica Demo",
                    "demo",
                    "70000000",
                    "Admin Demo",
                    "admin",
                    "admin@mail.test",
                    "secret123",
                    "12345",
                    null,
                    null,
                    null
            ));
        }

        private static final String REGIONAL_BODY = """
                {"name":"Clinica Demo","slug":"demo","phoneNumber":"70000000","adminName":"Admin Demo",
                 "adminUsername":"admin","adminEmail":"admin@mail.test","adminPassword":"secret123",
                 "country":"BR","timezone":"America/Manaus","defaultLanguage":"pt-BR"}
                """;

        @Test
        void shouldPassRegionalSettingsToService() throws Exception {
            when(clinicService.createClinic(any()))
                    .thenReturn(new ClinicCreatedResponse(7L, "Clinica Demo", "70000000", "demo", 1L, "admin", "a@b.c"));

            mvc.perform(post("/api/clinics").contentType(MediaType.APPLICATION_JSON).content(REGIONAL_BODY))
                    .andExpect(status().isCreated());

            verify(clinicService).createClinic(argThat(r ->
                    "BR".equals(r.country())
                            && "America/Manaus".equals(r.timezone())
                            && "pt-BR".equals(r.defaultLanguage())));
        }

        @Test
        void shouldReturnLocalizedBadRequestWhenServiceRejectsRegionalSettings() throws Exception {
            when(clinicService.createClinic(any()))
                    .thenThrow(new BadRequestException(MessageKeys.REGION_TIMEZONE_INVALID, "America/La_Paz", "BR"));

            mvc.perform(post("/api/clinics").contentType(MediaType.APPLICATION_JSON).content(REGIONAL_BODY))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("La zona horaria America/La_Paz no es válida para el país BR"));

            mvc.perform(post("/api/clinics")
                            .header("Accept-Language", "en")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(REGIONAL_BODY))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("The time zone America/La_Paz is not valid for country BR"));
        }

        @Test
        void shouldReturnBadRequestWhenCountryExceedsTwoCharacters() throws Exception {
            mvc.perform(post("/api/clinics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(REGIONAL_BODY.replace("\"BR\"", "\"BRA\"")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("country"));
        }
    }
}
