package com.example.pulso.service.impl;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.whatsapp.WhatsappPairingCodeResponse;
import com.example.pulso.dto.whatsapp.WhatsappStatusResponse;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ServiceUnavailableException;
import com.example.pulso.exchange.WhatsappExchange;
import com.example.pulso.exchange.contract.whatsapp.MessageRequest;
import com.example.pulso.exchange.contract.whatsapp.PairingCodeRequest;
import com.example.pulso.exchange.contract.whatsapp.SessionStatus;
import com.example.pulso.service.WhatsappExchangeService;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import com.example.pulso.util.Utils;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappExchangeServiceImpl implements WhatsappExchangeService {
    private final WhatsappExchange whatsappExchange;
    private final CurrentClinicProvider currentClinicProvider;

    @Override
    public Optional<byte[]> getSessionQr() {
        var sessionId = currentSessionId();
        try {
            return Optional.ofNullable(whatsappExchange.getSessionQr(sessionId)).filter(qr -> qr.length > 0);
        } catch (RestClientResponseException e) {
            if (hasStatus(e, HttpStatus.TOO_MANY_REQUESTS)) {
                log.warn("WhatsApp QR refused: session limit reached on the WhatsApp service");
                throw new ServiceUnavailableException(MessageKeys.WHATSAPP_SESSION_LIMIT);
            }
            throw unavailable("qr", e);
        } catch (RestClientException e) {
            throw unavailable("qr", e);
        }
    }

    @Override
    public WhatsappStatusResponse getSessionStatus() {
        var sessionId = currentSessionId();
        try {
            var status = whatsappExchange.getSessionStatus(sessionId);
            if (status == null) return toStatusResponse(sessionId, SessionStatus.IDLE, null);
            return toStatusResponse(sessionId, status.status(), Utils.addLeadingPlus(status.phone()));
        } catch (RestClientResponseException e) {
            if (hasStatus(e, HttpStatus.NOT_FOUND)) return toStatusResponse(sessionId, SessionStatus.IDLE, null);
            throw unavailable("status", e);
        } catch (RestClientException e) {
            throw unavailable("status", e);
        }
    }

    @Override
    public WhatsappPairingCodeResponse requestPairingCode() {
        var sessionId = currentSessionId();
        var phone = Utils.stripLeadingPlus(currentClinicProvider.getCurrentClinic().getPhoneNumber());
        if (!StringUtils.hasText(phone)) throw new BusinessException(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE);
        try {
            var response = whatsappExchange.requestPairingCode(sessionId, new PairingCodeRequest(phone));
            if (response == null || !StringUtils.hasText(response.code())) {
                log.warn("WhatsApp pairing code failed: empty response from the WhatsApp service");
                throw new ServiceUnavailableException(MessageKeys.WHATSAPP_UNAVAILABLE);
            }
            log.info("WhatsApp pairing code generated");
            return new WhatsappPairingCodeResponse(response.status(), response.code());
        } catch (RestClientResponseException e) {
            throw pairingFailure(e);
        } catch (RestClientException e) {
            throw unavailable("pairing-code", e);
        }
    }

    private static RuntimeException pairingFailure(RestClientResponseException e) {
        return switch (e.getStatusCode().value()) {
            case 409 -> new BusinessException(MessageKeys.WHATSAPP_ALREADY_LINKED);
            case 400 -> new BusinessException(MessageKeys.WHATSAPP_INVALID_CLINIC_PHONE);
            case 429 -> {
                log.warn("WhatsApp pairing code refused: session limit reached on the WhatsApp service");
                yield new ServiceUnavailableException(MessageKeys.WHATSAPP_SESSION_LIMIT);
            }
            case 504, 410 -> {
                log.warn("WhatsApp pairing code failed: status {}", e.getStatusCode().value());
                yield new ServiceUnavailableException(MessageKeys.WHATSAPP_PAIRING_TIMEOUT);
            }
            default -> unavailable("pairing-code", e);
        };
    }

    @Override
    public void logoutSession() {
        var sessionId = currentSessionId();
        try {
            whatsappExchange.logoutSession(sessionId);
            log.info("WhatsApp session unlinked");
        } catch (RestClientResponseException e) {
            if (hasStatus(e, HttpStatus.NOT_FOUND) || hasStatus(e, HttpStatus.CONFLICT))
                throw new BusinessException(MessageKeys.WHATSAPP_NO_ACTIVE_SESSION);
            throw unavailable("logout", e);
        } catch (RestClientException e) {
            throw unavailable("logout", e);
        }
    }

    @Override
    public void sendMessage(String sessionId, String to, String message, String ref) {
        if (!StringUtils.hasText(sessionId) || !StringUtils.hasText(to)) {
            log.info("WhatsApp message skipped: missing session or phone number [{}]", ref);
            return;
        }
        try {
            whatsappExchange.sendMessage(new MessageRequest(sessionId, Utils.stripLeadingPlus(to), message));
            log.info("WhatsApp message sent [{}]", ref);
        } catch (RestClientResponseException e) {
            log.warn(
                    "WhatsApp message failed [{}]: status {}",
                    ref,
                    e.getStatusCode().value()
            );
        } catch (RestClientException e) {
            log.warn(
                    "WhatsApp message failed [{}]: {}",
                    ref,
                    e.getClass().getSimpleName()
            );
        }
    }

    private WhatsappStatusResponse toStatusResponse(String sessionId, SessionStatus status, String linkedPhoneNumber) {
        return new WhatsappStatusResponse(
                sessionId,
                status,
                currentClinicProvider.getCurrentClinic().getPhoneNumber(),
                linkedPhoneNumber
        );
    }

    private static String currentSessionId() {
        var tenant = TenantContext.current();
        if (tenant == null) throw new IllegalStateException("No clinic tenant bound");
        return tenant.clinicSlug();
    }

    private static boolean hasStatus(RestClientResponseException e, HttpStatus status) {
        return e.getStatusCode().isSameCodeAs(status);
    }

    private static ServiceUnavailableException unavailable(String operation, RestClientException e) {
        if (e instanceof RestClientResponseException response) {
            log.warn(
                    "WhatsApp service {} failed: status {}",
                    operation,
                    response.getStatusCode().value()
            );
        } else {
            log.warn(
                    "WhatsApp service {} failed: {}",
                    operation,
                    e.getClass().getSimpleName()
            );
        }
        return new ServiceUnavailableException(MessageKeys.WHATSAPP_UNAVAILABLE);
    }
}
