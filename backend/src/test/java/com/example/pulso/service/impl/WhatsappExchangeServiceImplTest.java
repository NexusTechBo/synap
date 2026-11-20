package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ServiceUnavailableException;
import com.example.pulso.exchange.WhatsappExchange;
import com.example.pulso.exchange.contract.whatsapp.PairingCodeRequest;
import com.example.pulso.exchange.contract.whatsapp.PairingCodeResponse;
import com.example.pulso.exchange.contract.whatsapp.SessionStatus;
import com.example.pulso.exchange.contract.whatsapp.SessionStatusResponse;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@ExtendWith(MockitoExtension.class)
class WhatsappExchangeServiceImplTest {
    private static final String SLUG = "demo";
    private static final String CLINIC_PHONE = "+59170000020";

    @Mock
    private WhatsappExchange whatsappExchange;

    @Mock
    private CurrentClinicProvider currentClinicProvider;

    @InjectMocks
    private WhatsappExchangeServiceImpl service;

    @BeforeEach
    void bindTenant() {
        TenantContext.setCurrentTenant(1L, SLUG, ZoneOffset.UTC, SupportedCountry.BO);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private void givenClinicPhone(String phone) {
        when(currentClinicProvider.getCurrentClinic())
                .thenReturn(Clinic.builder().phoneNumber(phone).build());
    }

    private static RestClientResponseException httpError(int status) {
        return new RestClientResponseException(
                "error", status, "status", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8);
    }

    @Nested
    class GetSessionStatus {
        @Test
        void shouldPrefixLinkedPhoneWithPlus() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.getSessionStatus(SLUG))
                    .thenReturn(new SessionStatusResponse(SLUG, SessionStatus.READY, "59170000020"));

            var response = service.getSessionStatus();

            assertThat(response.id()).isEqualTo(SLUG);
            assertThat(response.status()).isEqualTo(SessionStatus.READY);
            assertThat(response.clinicPhoneNumber()).isEqualTo(CLINIC_PHONE);
            assertThat(response.linkedPhoneNumber()).isEqualTo("+59170000020");
        }

        @ParameterizedTest
        @NullAndEmptySource
        void shouldReturnNullLinkedPhoneWhenMissing(String phone) {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.getSessionStatus(SLUG))
                    .thenReturn(new SessionStatusResponse(SLUG, SessionStatus.QR_PENDING, phone));

            var response = service.getSessionStatus();

            assertThat(response.status()).isEqualTo(SessionStatus.QR_PENDING);
            assertThat(response.linkedPhoneNumber()).isNull();
        }

        @Test
        void shouldPropagatePairingPending() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.getSessionStatus(SLUG))
                    .thenReturn(new SessionStatusResponse(SLUG, SessionStatus.PAIRING_PENDING, null));

            assertThat(service.getSessionStatus().status()).isEqualTo(SessionStatus.PAIRING_PENDING);
        }

        @Test
        void shouldReturnIdleWhenResponseIsNull() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.getSessionStatus(SLUG)).thenReturn(null);

            var response = service.getSessionStatus();

            assertThat(response.status()).isEqualTo(SessionStatus.IDLE);
            assertThat(response.linkedPhoneNumber()).isNull();
            assertThat(response.clinicPhoneNumber()).isEqualTo(CLINIC_PHONE);
        }

        @Test
        void shouldReturnIdleWhenSessionNotFound() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.getSessionStatus(SLUG)).thenThrow(httpError(404));

            var response = service.getSessionStatus();

            assertThat(response.id()).isEqualTo(SLUG);
            assertThat(response.status()).isEqualTo(SessionStatus.IDLE);
            assertThat(response.linkedPhoneNumber()).isNull();
        }

        @Test
        void shouldThrowUnavailableOnServerError() {
            when(whatsappExchange.getSessionStatus(SLUG)).thenThrow(httpError(500));

            assertThatThrownBy(() -> service.getSessionStatus())
                    .isInstanceOfSatisfying(ServiceUnavailableException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_UNAVAILABLE));
        }

        @Test
        void shouldThrowUnavailableOnConnectionFailure() {
            when(whatsappExchange.getSessionStatus(SLUG)).thenThrow(new ResourceAccessException("down"));

            assertThatThrownBy(() -> service.getSessionStatus())
                    .isInstanceOfSatisfying(ServiceUnavailableException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_UNAVAILABLE));
        }

        @Test
        void shouldFailWhenNoTenantBound() {
            TenantContext.clear();

            assertThatThrownBy(() -> service.getSessionStatus()).isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class RequestPairingCode {
        @Test
        void shouldSendPhoneWithoutPlusAndReturnCode() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any(PairingCodeRequest.class)))
                    .thenReturn(new PairingCodeResponse(SLUG, SessionStatus.PAIRING_PENDING, "ABCD-1234"));

            var response = service.requestPairingCode();

            assertThat(response.status()).isEqualTo(SessionStatus.PAIRING_PENDING);
            assertThat(response.code()).isEqualTo("ABCD-1234");
            verify(whatsappExchange).requestPairingCode(SLUG, new PairingCodeRequest("59170000020"));
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "+"})
        void shouldRejectWhenClinicPhoneHasNoText(String phone) {
            givenClinicPhone(phone);

            assertThatThrownBy(() -> service.requestPairingCode())
                    .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE));
            verifyNoInteractions(whatsappExchange);
        }

        @Test
        void shouldThrowUnavailableWhenResponseIsNull() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenReturn(null);

            assertUnavailable(MessageKeys.WHATSAPP_UNAVAILABLE);
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"  "})
        void shouldThrowUnavailableWhenCodeIsEmpty(String code) {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any()))
                    .thenReturn(new PairingCodeResponse(SLUG, SessionStatus.PAIRING_PENDING, code));

            assertUnavailable(MessageKeys.WHATSAPP_UNAVAILABLE);
        }

        @Test
        void shouldMapConflictToAlreadyLinked() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(httpError(409));

            assertThatThrownBy(() -> service.requestPairingCode())
                    .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_ALREADY_LINKED));
        }

        @Test
        void shouldMapBadRequestToInvalidClinicPhone() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(httpError(400));

            assertThatThrownBy(() -> service.requestPairingCode())
                    .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE));
        }

        @Test
        void shouldMapTooManyRequestsToSessionLimit() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(httpError(429));

            assertUnavailable(MessageKeys.WHATSAPP_SESSION_LIMIT);
        }

        @ParameterizedTest
        @ValueSource(ints = {504, 410})
        void shouldMapTimeoutStatusesToPairingTimeout(int status) {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(httpError(status));

            assertUnavailable(MessageKeys.WHATSAPP_PAIRING_TIMEOUT);
        }

        @ParameterizedTest
        @ValueSource(ints = {500, 403})
        void shouldMapOtherStatusesToUnavailable(int status) {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(httpError(status));

            assertUnavailable(MessageKeys.WHATSAPP_UNAVAILABLE);
        }

        @Test
        void shouldMapConnectionFailureToUnavailable() {
            givenClinicPhone(CLINIC_PHONE);
            when(whatsappExchange.requestPairingCode(eq(SLUG), any())).thenThrow(new ResourceAccessException("down"));

            assertUnavailable(MessageKeys.WHATSAPP_UNAVAILABLE);
        }

        private void assertUnavailable(String key) {
            assertThatThrownBy(() -> service.requestPairingCode())
                    .isInstanceOfSatisfying(
                            ServiceUnavailableException.class, e -> assertThat(e.getMessageKey()).isEqualTo(key));
        }
    }

    @Nested
    class SessionQrAndLogout {
        @Test
        void shouldReturnQrBytes() {
            when(whatsappExchange.getSessionQr(SLUG)).thenReturn(new byte[] {1, 2});

            assertThat(service.getSessionQr()).contains(new byte[] {1, 2});
        }

        @Test
        void shouldReturnEmptyWhenQrIsEmpty() {
            when(whatsappExchange.getSessionQr(SLUG)).thenReturn(new byte[0]);

            assertThat(service.getSessionQr()).isEmpty();
        }

        @Test
        void shouldMapQrTooManyRequestsToSessionLimit() {
            when(whatsappExchange.getSessionQr(SLUG)).thenThrow(httpError(429));

            assertThatThrownBy(() -> service.getSessionQr())
                    .isInstanceOfSatisfying(ServiceUnavailableException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_SESSION_LIMIT));
        }

        @Test
        void shouldMapLogoutNotFoundToNoActiveSession() {
            doThrow(httpError(404)).when(whatsappExchange).logoutSession(SLUG);

            assertThatThrownBy(() -> service.logoutSession())
                    .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getMessageKey())
                            .isEqualTo(MessageKeys.WHATSAPP_NO_ACTIVE_SESSION));
        }
    }
}
