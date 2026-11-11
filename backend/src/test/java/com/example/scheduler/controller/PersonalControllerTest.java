package com.example.scheduler.controller;

import static com.example.scheduler.controller.SliceTokens.ADMIN_TOKEN;
import static com.example.scheduler.controller.SliceTokens.ASSISTANT_TOKEN;
import static com.example.scheduler.controller.SliceTokens.as;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.scheduler.config.JacksonConfig;
import com.example.scheduler.config.LocaleConfig;
import com.example.scheduler.config.SecurityConfig;
import com.example.scheduler.config.ratelimiting.RateLimitProperties;
import com.example.scheduler.dto.login.LoginResponse;
import com.example.scheduler.dto.personal.DoctorModeRequest;
import com.example.scheduler.dto.personal.PersonalRequest;
import com.example.scheduler.dto.personal.PersonalResponse;
import com.example.scheduler.enums.ERole;
import com.example.scheduler.exception.BusinessException;
import com.example.scheduler.exception.ErrorResponseWriter;
import com.example.scheduler.security.ActiveUserChecker;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.security.jwt.JwtUtil;
import com.example.scheduler.service.AuthService;
import com.example.scheduler.service.DoctorPatientService;
import com.example.scheduler.service.PersonalService;
import java.util.Map;
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

@WebMvcTest(controllers = PersonalController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    PersonalControllerTest.SliceSecurityConfig.class
})
class PersonalControllerTest {
    private static final String CI_PATTERN_MESSAGE = "debe contener solo números, entre 5 y 10 dígitos";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PersonalService personalService;

    @MockitoBean
    private DoctorPatientService doctorPatientService;

    @MockitoBean
    private AuthService authService;

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
                {"name":"Dr House","email":"house@mail.test","phoneNumber":"70000000","ci":"%s",
                 "username":"house","password":"secret123","role":"DOCTOR","specialtyId":1}
                """.formatted(ci);
    }

    private static PersonalResponse response(String ci) {
        return new PersonalResponse(
                10L,
                "house",
                ci,
                "Dr House",
                "house@mail.test",
                "70000000",
                true,
                false,
                "DOCTOR",
                1L,
                "Cardiologia"
        );
    }

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Nested
    class CreatePersonal {
        @Test
        void shouldReturnBadRequestWithCiFieldErrorWhenCiHasSpaces() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, post("/api/personal"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("12 345")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Error de validación en los datos enviados."))
                    .andExpect(jsonPath("$.errors", hasSize(1)))
                    .andExpect(jsonPath("$.errors[0].field").value("ci"))
                    .andExpect(jsonPath("$.errors[0].message").value(CI_PATTERN_MESSAGE))
                    .andExpect(jsonPath("$.path").value("/api/personal"));

            verifyNoInteractions(personalService);
        }

        @Test
        void shouldReturnBadRequestWithCiFieldErrorWhenCiIsNegative() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, post("/api/personal"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("-12345")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("ci"))
                    .andExpect(jsonPath("$.errors[0].message").value(CI_PATTERN_MESSAGE));

            verifyNoInteractions(personalService);
        }

        @Test
        void shouldReturnCreatedWhenCiIsValid() throws Exception {
            when(personalService.createPersonal(any())).thenReturn(response("1234567890"));

            mvc.perform(as(ADMIN_TOKEN, post("/api/personal"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body("1234567890")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(10))
                    .andExpect(jsonPath("$.ci").value("1234567890"));

            verify(personalService).createPersonal(new PersonalRequest(
                    "Dr House",
                    "house@mail.test",
                    "70000000",
                    "1234567890",
                    "house",
                    "secret123",
                    ERole.DOCTOR,
                    1L
            ));
        }
    }

    @Nested
    class UpdateDoctorMode {
        @Test
        void shouldReturnOkAndPassNewFieldsToService() throws Exception {
            when(authService.issueToken(anyLong())).thenReturn(new LoginResponse("new-token"));

            mvc.perform(as(ADMIN_TOKEN, put("/api/personal/me/doctor-mode"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"enabled":false,"cancelAppointments":true,"cancellationReason":"Vacaciones"}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value("new-token"));

            verify(personalService).updateDoctorMode(1L, new DoctorModeRequest(false, null, true, "Vacaciones"));
        }

        @Test
        void shouldReturnBadRequestWhenReasonTooLong() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, put("/api/personal/me/doctor-mode"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"enabled\":false,\"cancelAppointments\":true,\"cancellationReason\":\""
                                    + "a".repeat(501) + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("cancellationReason"));

            verifyNoInteractions(personalService);
        }

        @Test
        void shouldReturnConflictWithCodeAndCountDetails() throws Exception {
            doThrow(BusinessException.withDetails(
                    Map.of("count", 2L),
                    MessageKeys.PERSONAL_DOCTOR_MODE_ACTIVE_APPOINTMENTS_CONFLICT,
                    2L
            ))
                    .when(personalService)
                    .updateDoctorMode(anyLong(), any());

            mvc.perform(as(ADMIN_TOKEN, put("/api/personal/me/doctor-mode"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"enabled\":false}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("personal.doctorModeActiveAppointmentsConflict"))
                    .andExpect(jsonPath("$.details.count").value(2));

            verifyNoInteractions(authService);
        }

        @Test
        void shouldReturnForbiddenForNonAdministrator() throws Exception {
            mvc.perform(as(ASSISTANT_TOKEN, put("/api/personal/me/doctor-mode"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"enabled\":false}"))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(personalService);
        }
    }
}
