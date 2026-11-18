package com.example.pulso.websocket;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.security.profile.RoleProfile;
import com.example.pulso.security.util.SecurityUtils;
import com.example.pulso.websocket.event.AppointmentChangedEvent;
import com.example.pulso.websocket.event.SessionRefreshEvent;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {
    private static final String INVALID_TOKEN = "Invalid token";
    private static final String STALE_TOKEN = "Stale token";
    private static final String FORBIDDEN_DESTINATION = "Forbidden destination";
    static final String CLINIC_ID_ATTRIBUTE = "clinicId";
    static final String TOKEN_EXPIRES_AT_ATTRIBUTE = "tokenExpiresAt";

    private final JwtUtils jwtUtil;
    private final ActiveUserChecker activeUserChecker;
    private final Clock clock;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;
        switch (accessor.getCommand()) {
            case CONNECT -> authenticate(accessor);
            case SUBSCRIBE -> authorizeSubscription(accessor);
            case SEND -> throw new MessageDeliveryException("Sending is not supported");
            default -> {}
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        var token = SecurityUtils.extractBearerToken(accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION));
        var attrs = accessor.getSessionAttributes();
        if (token == null) throw new MessageDeliveryException("Missing bearer token");
        var claims = jwtUtil.parse(token).orElseThrow(() -> new MessageDeliveryException(INVALID_TOKEN));
        var roles = JwtUtils.extractRoles(claims);
        var profile = RoleProfile.fromRoles(roles).orElseThrow(() -> new MessageDeliveryException(INVALID_TOKEN));
        if (profile.isGuest()) throw new MessageDeliveryException("Guests cannot connect");
        if (claims.getExpiration() == null) throw new MessageDeliveryException(INVALID_TOKEN);
        var clinicId = JwtUtils.extractClinicId(claims);
        var clinicSlug = JwtUtils.extractClinicSlug(claims);
        TenantContext.setCurrentTenant(clinicId, clinicSlug, JwtUtils.extractZone(claims), JwtUtils.extractCountry(claims));
        TokenStatus status;
        try {
            status = activeUserChecker.check(claims, profile);
        } finally {
            TenantContext.clear();
        }
        if (status != TokenStatus.VALID) {
            log.warn(
                    "STOMP CONNECT rejected ({}): user {} with roles {} in clinic {}",
                    status,
                    claims.getSubject(),
                    roles,
                    clinicId);
            throw new MessageDeliveryException(status == TokenStatus.STALE ? STALE_TOKEN : INVALID_TOKEN);
        }
        if (attrs == null) throw new MessageDeliveryException(INVALID_TOKEN);
        attrs.put(CLINIC_ID_ATTRIBUTE, clinicId);
        attrs.put(TOKEN_EXPIRES_AT_ATTRIBUTE, claims.getExpiration().toInstant());
        accessor.setUser(SecurityUtils.authenticated(claims.getSubject(), roles));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        var attrs = accessor.getSessionAttributes();
        if (!(accessor.getUser() instanceof Authentication auth) || attrs == null || !(attrs.get(CLINIC_ID_ATTRIBUTE) instanceof Long clinicId))
            throw new MessageDeliveryException("Not authenticated");
        if (!(attrs.get(TOKEN_EXPIRES_AT_ATTRIBUTE) instanceof Instant expiresAt) || !clock.instant().isBefore(expiresAt)) {
            log.info("STOMP SUBSCRIBE rejected: token of user {} in clinic {} expired", auth.getName(), clinicId);
            throw new MessageDeliveryException(INVALID_TOKEN);
        }
        if (!isAllowedDestination(auth, clinicId, accessor.getDestination()))
            throw new MessageDeliveryException(FORBIDDEN_DESTINATION);
    }

    private static boolean isAllowedDestination(Authentication auth, Long clinicId, String destination) {
        if (destination == null) return false;
        if (SessionRefreshEvent.topic(clinicId).equals(destination)) return true;
        if (SecurityUtils.isRestrictedToOwnData(auth))
            return AppointmentChangedEvent.doctorBoardTopic(clinicId, SecurityUtils.extractUserId(auth))
                    .equals(destination);
        return AppointmentChangedEvent.boardTopic(clinicId).equals(destination) || AppointmentChangedEvent.isDoctorBoardTopicOfClinic(clinicId, destination);
    }
}
