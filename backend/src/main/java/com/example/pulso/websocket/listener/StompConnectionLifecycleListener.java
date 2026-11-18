package com.example.pulso.websocket.listener;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.security.profile.RoleProfile;
import com.example.pulso.websocket.StompConnectionRegistry;
import com.example.pulso.websocket.StompSessionCloser;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompConnectionLifecycleListener {
    private final StompConnectionRegistry registry;
    private final StompSessionCloser sessionCloser;
    private final ActiveUserChecker activeUserChecker;

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        var headers = event.getMessage().getHeaders();
        var connectMessage = headers.get(SimpMessageHeaderAccessor.CONNECT_MESSAGE_HEADER, Message.class);
        var stompSessionId = SimpMessageHeaderAccessor.getSessionId(headers);
        if (connectMessage == null || stompSessionId == null) return;
        var claims = claimsOf(connectMessage);
        if (claims == null) return;
        var clinicId = JwtUtils.extractClinicId(claims);
        var userId = Long.valueOf(claims.getSubject());
        var sessionId = JwtUtils.extractSessionId(claims).orElse(null);
        if (sessionId == null) {
            log.warn("STOMP session of user {} in clinic {} closed: token without session id", userId, clinicId);
            sessionCloser.close(stompSessionId);
            return;
        }
        registry.register(clinicId, userId, stompSessionId, sessionId);
        if (!isStillValid(claims)) {
            log.info("STOMP session of user {} in clinic {} closed: revoked while connecting", userId, clinicId);
            sessionCloser.close(stompSessionId);
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        var claims = claimsOf(event.getMessage());
        if (claims == null) return;
        registry.unregister(JwtUtils.extractClinicId(claims), Long.valueOf(claims.getSubject()), event.getSessionId());
    }

    private boolean isStillValid(Claims claims) {
        var profile = RoleProfile.fromRoles(JwtUtils.extractRoles(claims)).orElse(null);
        if (profile == null) return false;
        TenantContext.setCurrentTenant(
                JwtUtils.extractClinicId(claims),
                JwtUtils.extractClinicSlug(claims),
                JwtUtils.extractZone(claims),
                JwtUtils.extractCountry(claims));
        try {
            return activeUserChecker.check(claims, profile) == TokenStatus.VALID;
        } finally {
            TenantContext.clear();
        }
    }

    private static Claims claimsOf(Message<?> message) {
        var attributes = SimpMessageHeaderAccessor.getSessionAttributes(message.getHeaders());
        return attributes != null && attributes.get(JwtChannelInterceptor.CLAIMS_ATTRIBUTE) instanceof Claims claims ? claims : null;
    }
}
