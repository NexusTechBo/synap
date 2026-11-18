package com.example.pulso.controller;

import static com.example.pulso.controller.SliceTokens.ASSISTANT_TOKEN;
import static com.example.pulso.controller.SliceTokens.as;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.service.PatientService;
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

@WebMvcTest(controllers = PatientController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    PatientControllerTest.SliceSecurityConfig.class
})
class PatientControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PatientService patientService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    @BeforeEach
    void setUpTokens() {
        SliceTokens.givenStandardTokens(jwtUtil, activeUserChecker);
    }

    private static String body(String ci) {
        return """
                {"document":"%s","name":"Ana Perez","email":"ana@mail.test","phoneNumber":"70000000"}
                """.formatted(ci);
    }

    private static PatientRequest request(String ci) {
        return new PatientRequest(ci, "Ana Perez", "ana@mail.test", "70000000");
    }

    private static PatientResponse response(Long id, String ci) {
        return new PatientResponse(id, ci, "Ana Perez", "ana@mail.test", "70000000", true);
    }

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Nested
    class CreatePatient {
        @Test
        void shouldReturnCreatedWhenCiIsOmitted() throws Exception {
            when(patientService.createPatient(any())).thenReturn(response(21L, null));

            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name":"Ana Perez","email":"ana@mail.test","phoneNumber":"70000000"}
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(21))
                    .andExpect(jsonPath("$.document").doesNotExist());

            verify(patientService).createPatient(request(null));
        }

        @Test
        void shouldReturnCreatedWhenCiIsBlank() throws Exception {
            when(patientService.createPatient(any())).thenReturn(response(21L, null));

            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("")))
                    .andExpect(status().isCreated());
        }

        @Test
        void shouldPassStrippedCiToServiceWhenJsonCiHasSurroundingSpaces() throws Exception {
            when(patientService.createPatient(any())).thenReturn(response(22L, "12345"));

            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(" 12345 ")))
                    .andExpect(status().isCreated());

            verify(patientService).createPatient(request("12345"));
        }

        @Test
        void shouldReturnLocalizedBadRequestWhenServiceRejectsDocument() throws Exception {
            when(patientService.createPatient(any()))
                    .thenThrow(new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID));

            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("12a456")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID))
                    .andExpect(jsonPath("$.message").value("El CPF debe tener 11 dígitos y un dígito verificador válido"))
                    .andExpect(jsonPath("$.path").value("/api/patients"));
        }

        @Test
        void shouldReturnBadRequestWithDocumentFieldErrorWhenDocumentExceedsTwentyCharacters() throws Exception {
            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("1".repeat(21))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors", hasSize(1)))
                    .andExpect(jsonPath("$.errors[0].field").value("document"));

            verifyNoInteractions(patientService);
        }

        @Test
        void shouldReturnCreatedWhenCiHasFiveDigits() throws Exception {
            when(patientService.createPatient(any())).thenReturn(response(20L, "12345"));

            mvc.perform(as(ASSISTANT_TOKEN, post("/api/patients"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("12345")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(20))
                    .andExpect(jsonPath("$.document").value("12345"));

            verify(patientService).createPatient(request("12345"));
        }
    }

    @Nested
    class UpdatePatient {
        @Test
        void shouldReturnLocalizedBadRequestWhenServiceRejectsDocument() throws Exception {
            when(patientService.updatePatientById(anyLong(), any()))
                    .thenThrow(new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID));

            mvc.perform(as(ASSISTANT_TOKEN, put("/api/patients/20"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("1234")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID))
                    .andExpect(jsonPath("$.message").value("debe contener solo dígitos, entre 5 y 10 caracteres"))
                    .andExpect(jsonPath("$.path").value("/api/patients/20"));
        }

        @Test
        void shouldReturnOkWhenCiHasTenDigits() throws Exception {
            when(patientService.updatePatientById(anyLong(), any())).thenReturn(response(20L, "1234567890"));

            mvc.perform(as(ASSISTANT_TOKEN, put("/api/patients/20"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("1234567890")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.document").value("1234567890"));

            verify(patientService).updatePatientById(20L, request("1234567890"));
        }
    }
}
