package com.example.pulso.controller;

import static com.example.pulso.controller.SliceTokens.ADMIN_TOKEN;
import static com.example.pulso.controller.SliceTokens.GUEST_TOKEN;
import static com.example.pulso.controller.SliceTokens.as;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.pulso.dto.guest.GuestAppointmentRequest;
import com.example.pulso.dto.guest.GuestAppointmentResponse;
import com.example.pulso.dto.guest.GuestNewPatientRequest;
import com.example.pulso.dto.guest.GuestPatientRequest;
import com.example.pulso.enums.AppointmentStatus;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.service.GuestService;
import com.example.pulso.service.SpecialtyService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

@WebMvcTest(controllers = GuestController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    GuestControllerTest.SliceSecurityConfig.class
})
class GuestControllerTest {
    private static final LocalDateTime START = LocalDateTime.of(2026, 11, 10, 9, 0);
    private static final LocalDate RANGE_FROM = LocalDate.of(2026, 11, 6);
    private static final LocalDate RANGE_TO = LocalDate.of(2026, 11, 19);
    private static final String UNAVAILABLE_DATES_PATH = "/api/guest/doctors/10/unavailable-dates";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private GuestService guestService;

    @MockitoBean
    private SpecialtyService specialtyService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    @BeforeEach
    void setUpTokens() {
        SliceTokens.givenStandardTokens(jwtUtil, activeUserChecker);
    }

    private static String existingPatientBody() {
        return """
                {"doctorId":10,"startTime":"2026-11-10T09:00:00",
                 "patient":{"phoneNumber":"70000000"}}
                """;
    }

    private static String existingPatientBodyWithoutPhone() {
        return """
                {"doctorId":10,"startTime":"2026-11-10T09:00:00","patient":{}}
                """;
    }

    private static String newPatientBodyWithoutCi() {
        return """
                {"doctorId":10,"startTime":"2026-11-10T09:00:00",
                 "patient":{"name":"Ana Perez","phoneNumber":"70000000","email":"ana@mail.test"}}
                """;
    }

    private static String newPatientBody(String ci) {
        return """
                {"doctorId":10,"startTime":"2026-11-10T09:00:00",
                 "patient":{"document":"%s","name":"Ana Perez","phoneNumber":"70000000","email":"ana@mail.test"}}
                """.formatted(ci);
    }

    private static GuestAppointmentResponse response() {
        return new GuestAppointmentResponse(
                99L,
                "Dr House",
                "Cardiologia",
                START,
                START.plusMinutes(30),
                AppointmentStatus.PENDING
        );
    }

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Nested
    class GetDoctorUnavailableDates {
        @Test
        void shouldReturnUnavailableDatesAsIsoStringsWhenGuestRequestsARange() throws Exception {
            when(guestService.getDoctorUnavailableDates(10L, RANGE_FROM, RANGE_TO))
                    .thenReturn(new DoctorUnavailableDatesResponse(
                            10L,
                            RANGE_FROM,
                            RANGE_TO,
                            List.of(LocalDate.of(2026, 11, 8), LocalDate.of(2026, 11, 9))
                    ));

            mvc.perform(as(GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "2026-11-06")
                            .param("to", "2026-11-19"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.doctorId").value(10))
                    .andExpect(jsonPath("$.from").value("2026-11-06"))
                    .andExpect(jsonPath("$.to").value("2026-11-19"))
                    .andExpect(jsonPath("$.unavailableDates", hasSize(2)))
                    .andExpect(jsonPath("$.unavailableDates[0]").value("2026-11-08"))
                    .andExpect(jsonPath("$.unavailableDates[1]").value("2026-11-09"));
        }

        @Test
        void shouldReturnForbiddenWhenStaffTokenIsUsed() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "2026-11-06")
                            .param("to", "2026-11-19"))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(guestService);
        }

        @Test
        void shouldReturnUnauthorizedWhenGuestTokenOnlyHasLegacyRoleClaim() throws Exception {
            SliceTokens.givenLegacyRoleOnlyGuestToken(jwtUtil);

            mvc.perform(as(SliceTokens.LEGACY_ROLE_GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "2026-11-06")
                            .param("to", "2026-11-19"))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(guestService);
        }

        @Test
        void shouldReturnUnauthorizedWhenThereIsNoToken() throws Exception {
            mvc.perform(get(UNAVAILABLE_DATES_PATH).param("from", "2026-11-06").param("to", "2026-11-19"))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(guestService);
        }

        @Test
        void shouldReturnBadRequestWithCodeAndSpanishMessageWhenRangeIsInvalid() throws Exception {
            when(guestService.getDoctorUnavailableDates(10L, RANGE_TO, RANGE_FROM))
                    .thenThrow(new BadRequestException(MessageKeys.AVAILABILITY_INVALID_DATE_RANGE, 31));

            mvc.perform(as(GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "2026-11-19")
                            .param("to", "2026-11-06"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(MessageKeys.AVAILABILITY_INVALID_DATE_RANGE))
                    .andExpect(jsonPath("$.message", containsString("no puede superar los 31 días")));
        }

        @Test
        void shouldReturnNotFoundWhenDoctorIsUnknown() throws Exception {
            when(guestService.getDoctorUnavailableDates(10L, RANGE_FROM, RANGE_TO))
                    .thenThrow(new ResourceNotFoundException(MessageKeys.PERSONAL_DOCTOR_NOT_FOUND, 10L));

            mvc.perform(as(GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "2026-11-06")
                            .param("to", "2026-11-19"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value(MessageKeys.PERSONAL_DOCTOR_NOT_FOUND));
        }

        @Test
        void shouldReturnBadRequestWhenAParamIsMissing() throws Exception {
            mvc.perform(as(GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH)).param("from", "2026-11-06"))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(guestService);
        }

        @Test
        void shouldReturnBadRequestWhenADateIsMalformed() throws Exception {
            mvc.perform(as(GUEST_TOKEN, get(UNAVAILABLE_DATES_PATH))
                            .param("from", "06-11-2026")
                            .param("to", "2026-11-19"))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(guestService);
        }
    }

    @Nested
    class BookAppointment {
        @Test
        @DisplayName("should return 400 with patient.phoneNumber field error when phoneNumber is missing")
        void shouldReturnBadRequestWhenPhoneNumberIsMissing() throws Exception {
            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(existingPatientBodyWithoutPhone()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("patient.phoneNumber"));

            verifyNoInteractions(guestService);
        }

        @Test
        @DisplayName("should return 201 when only phoneNumber is sent")
        void shouldReturnCreatedWhenOnlyPhoneNumberIsSent() throws Exception {
            when(guestService.bookAppointment(any())).thenReturn(response());

            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(existingPatientBody()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.appointmentId").value(99))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(guestService).bookAppointment(
                    new GuestAppointmentRequest<>(10L, START, new GuestPatientRequest("70000000"))
            );
        }

        @Test
        void shouldReturnForbiddenWhenStaffTokenIsUsed() throws Exception {
            mvc.perform(as(ADMIN_TOKEN, post("/api/guest/appointments"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(existingPatientBody()))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(guestService);
        }
    }

    @Nested
    class BookAppointmentForNewPatient {
        @Test
        @DisplayName("should return 201 when the CI is omitted")
        void shouldReturnCreatedWhenCiIsOmitted() throws Exception {
            when(guestService.bookAppointmentForNewPatient(any())).thenReturn(response());

            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments/new-patient"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(newPatientBodyWithoutCi()))
                    .andExpect(status().isCreated());

            verify(guestService).bookAppointmentForNewPatient(new GuestAppointmentRequest<>(
                    10L,
                    START,
                    new GuestNewPatientRequest(null, "Ana Perez", "70000000", "ana@mail.test")
            ));
        }

        @Test
        @DisplayName("should return 201 when the CI is blank")
        void shouldReturnCreatedWhenCiIsBlank() throws Exception {
            when(guestService.bookAppointmentForNewPatient(any())).thenReturn(response());

            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments/new-patient"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(newPatientBody("  ")))
                    .andExpect(status().isCreated());
        }

        @Test
        void shouldReturnLocalizedBadRequestWhenServiceRejectsDocument() throws Exception {
            when(guestService.bookAppointmentForNewPatient(any()))
                    .thenThrow(new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID));

            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments/new-patient"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(newPatientBody("12345678901")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID))
                    .andExpect(jsonPath("$.message").value("El CPF debe tener 11 dígitos y un dígito verificador válido"));
        }

        @Test
        void shouldReturnBadRequestWithDocumentFieldErrorWhenDocumentExceedsTwentyCharacters() throws Exception {
            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments/new-patient"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(newPatientBody("1".repeat(21))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors", hasSize(1)))
                    .andExpect(jsonPath("$.errors[0].field").value("patient.document"));

            verifyNoInteractions(guestService);
        }

        @Test
        void shouldReturnCreatedWhenCiIsValid() throws Exception {
            when(guestService.bookAppointmentForNewPatient(any())).thenReturn(response());

            mvc.perform(as(GUEST_TOKEN, post("/api/guest/appointments/new-patient"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(newPatientBody("1234567890")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.appointmentId").value(99));

            verify(guestService).bookAppointmentForNewPatient(new GuestAppointmentRequest<>(
                    10L,
                    START,
                    new GuestNewPatientRequest("1234567890", "Ana Perez", "70000000", "ana@mail.test")
            ));
        }
    }
}
