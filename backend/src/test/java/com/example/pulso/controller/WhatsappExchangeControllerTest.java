package com.example.pulso.controller;

import static com.example.pulso.controller.SliceTokens.ADMIN_TOKEN;
import static com.example.pulso.controller.SliceTokens.ASSISTANT_TOKEN;
import static com.example.pulso.controller.SliceTokens.DOCTOR_TOKEN;
import static com.example.pulso.controller.SliceTokens.as;
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
import com.example.pulso.dto.whatsapp.WhatsappPairingCodeResponse;
import com.example.pulso.dto.whatsapp.WhatsappStatusResponse;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ServiceUnavailableException;
import com.example.pulso.exchange.contract.whatsapp.SessionStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.WhatsappExchangeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = WhatsappExchangeController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    WhatsappExchangeControllerTest.SliceSecurityConfig.class
})
class WhatsappExchangeControllerTest {
    private static final String PAIRING_URL = "/api/whatsapp/pairing-code";
    private static final String STATUS_URL = "/api/whatsapp/status";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private WhatsappExchangeService whatsappExchangeService;

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
    class PairingCode {
        @Test
        void shouldReturnStatusAndCodeForAdministrator() throws Exception {
            when(whatsappExchangeService.requestPairingCode())
                    .thenReturn(new WhatsappPairingCodeResponse(SessionStatus.PAIRING_PENDING, "ABCD-1234"));

            mvc.perform(as(ADMIN_TOKEN, post(PAIRING_URL)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PAIRING_PENDING"))
                    .andExpect(jsonPath("$.code").value("ABCD-1234"));
        }

        @Test
        void shouldReturnForbiddenForAssistant() throws Exception {
            mvc.perform(as(ASSISTANT_TOKEN, post(PAIRING_URL))).andExpect(status().isForbidden());

            verifyNoInteractions(whatsappExchangeService);
        }

        @Test
        void shouldReturnForbiddenForDoctor() throws Exception {
            mvc.perform(as(DOCTOR_TOKEN, post(PAIRING_URL))).andExpect(status().isForbidden());

            verifyNoInteractions(whatsappExchangeService);
        }

        @Test
        void shouldReturnUnauthorizedWithoutToken() throws Exception {
            mvc.perform(post(PAIRING_URL)).andExpect(status().isUnauthorized());

            verifyNoInteractions(whatsappExchangeService);
        }

        @Test
        void shouldMapAlreadyLinkedToConflict() throws Exception {
            when(whatsappExchangeService.requestPairingCode())
                    .thenThrow(new BusinessException(MessageKeys.WHATSAPP_ALREADY_LINKED));

            mvc.perform(as(ADMIN_TOKEN, post(PAIRING_URL)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value(MessageKeys.WHATSAPP_ALREADY_LINKED));
        }

        @Test
        void shouldMapInvalidClinicPhoneToConflict() throws Exception {
            when(whatsappExchangeService.requestPairingCode())
                    .thenThrow(new BusinessException(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE));

            mvc.perform(as(ADMIN_TOKEN, post(PAIRING_URL)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE));
        }

        @Test
        void shouldMapServiceUnavailableTo503() throws Exception {
            when(whatsappExchangeService.requestPairingCode())
                    .thenThrow(new ServiceUnavailableException(MessageKeys.WHATSAPP_PAIRING_TIMEOUT));

            mvc.perform(as(ADMIN_TOKEN, post(PAIRING_URL)))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value(MessageKeys.WHATSAPP_PAIRING_TIMEOUT));
        }
    }

    @Nested
    class Status {
        @Test
        void shouldIncludeLinkedPhoneNumber() throws Exception {
            when(whatsappExchangeService.getSessionStatus())
                    .thenReturn(new WhatsappStatusResponse("demo", SessionStatus.READY, "+59170000020", "+59170000021"));

            mvc.perform(as(ADMIN_TOKEN, get(STATUS_URL)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value("demo"))
                    .andExpect(jsonPath("$.status").value("READY"))
                    .andExpect(jsonPath("$.clinicPhoneNumber").value("+59170000020"))
                    .andExpect(jsonPath("$.linkedPhoneNumber").value("+59170000021"));
        }

        @Test
        void shouldReturnForbiddenForAssistant() throws Exception {
            mvc.perform(as(ASSISTANT_TOKEN, get(STATUS_URL))).andExpect(status().isForbidden());
        }
    }
}
