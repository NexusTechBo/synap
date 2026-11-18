package com.example.pulso.websocket.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.profile.RoleProfile;
import com.example.pulso.websocket.StompConnectionRegistry;
import com.example.pulso.websocket.StompSessionCloser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@ExtendWith(MockitoExtension.class)
class StompConnectionLifecycleListenerTest {
    private static final Long CLINIC = 7L;
    private static final Long USER = 1L;
    private static final String STOMP_SESSION = "stomp-1";

    @Mock
    private StompSessionCloser closer;

    @Mock
    private ActiveUserChecker activeUserChecker;

    private final StompConnectionRegistry registry = new StompConnectionRegistry();

    private StompConnectionLifecycleListener listener() {
        return new StompConnectionLifecycleListener(registry, closer, activeUserChecker);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Claims claims(UUID sid, List<String> roles) {
        var builder = Jwts.claims()
                .subject(USER.toString())
                .add(JwtClaims.ROLES, roles)
                .add(JwtClaims.CLINIC_ID, CLINIC)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz")
                .add(JwtClaims.COUNTRY, "BO");
        if (sid != null) builder.add(JwtClaims.SESSION_ID, sid.toString());
        return builder.build();
    }

    private Claims adminClaims() {
        return claims(UUID.randomUUID(), List.of("ADMINISTRATOR"));
    }

    private Message<byte[]> connectMessage(Object claims) {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        var attributes = new HashMap<String, Object>();
        if (claims != null) attributes.put(JwtChannelInterceptor.CLAIMS_ATTRIBUTE, claims);
        accessor.setSessionAttributes(attributes);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private SessionConnectedEvent connectedEvent(Message<byte[]> connect, String stompSessionId) {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECTED);
        if (stompSessionId != null) accessor.setSessionId(stompSessionId);
        if (connect != null) accessor.setHeader(SimpMessageHeaderAccessor.CONNECT_MESSAGE_HEADER, connect);
        accessor.setLeaveMutable(true);
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        return new SessionConnectedEvent(this, message, null);
    }

    private SessionDisconnectEvent disconnectEvent(Object claims, String stompSessionId) {
        var accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setSessionId(stompSessionId);
        var attributes = new HashMap<String, Object>();
        if (claims != null) attributes.put(JwtChannelInterceptor.CLAIMS_ATTRIBUTE, claims);
        accessor.setSessionAttributes(attributes);
        accessor.setLeaveMutable(true);
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        return new SessionDisconnectEvent(this, message, stompSessionId, CloseStatus.NORMAL);
    }

    @Nested
    class Connected {
        @Test
        void shouldRegisterConnectionAndNotCloseWhenStillValid() {
            var sid = UUID.randomUUID();
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.VALID);

            listener().onConnected(connectedEvent(connectMessage(claims(sid, List.of("ADMINISTRATOR"))), STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly(STOMP_SESSION);
            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, sid)).isEmpty();
            verifyNoInteractions(closer);
        }

        @Test
        void shouldRegisterBeforeCheckingActiveUser() {
            var registeredWhenChecked = new AtomicReference<List<String>>();
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenAnswer(invocation -> {
                registeredWhenChecked.set(registry.stompSessionsOfExcept(CLINIC, USER, null));
                return TokenStatus.VALID;
            });

            listener().onConnected(connectedEvent(connectMessage(adminClaims()), STOMP_SESSION));

            assertThat(registeredWhenChecked.get()).containsExactly(STOMP_SESSION);
        }

        @Test
        void shouldCloseSessionWhenCheckReportsStale() {
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.STALE);

            listener().onConnected(connectedEvent(connectMessage(adminClaims()), STOMP_SESSION));

            verify(closer).close(STOMP_SESSION);
        }

        @Test
        void shouldCloseSessionWhenCheckReportsInvalid() {
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.INVALID);

            listener().onConnected(connectedEvent(connectMessage(claims(UUID.randomUUID(), List.of("DOCTOR"))), STOMP_SESSION));

            verify(closer).close(STOMP_SESSION);
        }

        @Test
        void shouldCheckWithRoleProfileOfClaims() {
            when(activeUserChecker.check(any(Claims.class), eq(new RoleProfile(ERole.DOCTOR)))).thenReturn(TokenStatus.VALID);

            listener().onConnected(connectedEvent(connectMessage(claims(UUID.randomUUID(), List.of("DOCTOR"))), STOMP_SESSION));

            verify(activeUserChecker).check(any(Claims.class), eq(new RoleProfile(ERole.DOCTOR)));
            verifyNoInteractions(closer);
        }

        @Test
        void shouldBindTenantDuringCheckAndClearItAfterwards() {
            var tenantDuringCheck = new AtomicReference<Long>();
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenAnswer(invocation -> {
                tenantDuringCheck.set(TenantContext.getCurrentClinicId());
                return TokenStatus.VALID;
            });

            listener().onConnected(connectedEvent(connectMessage(adminClaims()), STOMP_SESSION));

            assertThat(tenantDuringCheck.get()).isEqualTo(CLINIC);
            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldClearTenantWhenCheckThrows() {
            when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenThrow(new IllegalStateException("db down"));
            var event = connectedEvent(connectMessage(adminClaims()), STOMP_SESSION);

            assertThatThrownBy(() -> listener().onConnected(event)).isInstanceOf(IllegalStateException.class);

            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldCloseWithoutCheckingWhenRolesAreNotAValidProfile() {
            listener().onConnected(connectedEvent(connectMessage(claims(UUID.randomUUID(), List.of())), STOMP_SESSION));

            verify(closer).close(STOMP_SESSION);
            verifyNoInteractions(activeUserChecker);
            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldCloseWithoutRegisteringNorCheckingWhenClaimsHaveNoSessionId() {
            listener().onConnected(connectedEvent(connectMessage(claims(null, List.of("ADMINISTRATOR"))), STOMP_SESSION));

            verify(closer).close(STOMP_SESSION);
            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
            verifyNoInteractions(activeUserChecker);
        }

        @Test
        void shouldDoNothingWhenConnectMessageIsMissing() {
            listener().onConnected(connectedEvent(null, STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
            verifyNoInteractions(closer, activeUserChecker);
        }

        @Test
        void shouldDoNothingWhenClaimsAttributeIsMissing() {
            listener().onConnected(connectedEvent(connectMessage(null), STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
            verifyNoInteractions(closer, activeUserChecker);
        }

        @Test
        void shouldDoNothingWhenClaimsAttributeIsNotClaims() {
            listener().onConnected(connectedEvent(connectMessage("not-claims"), STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
            verifyNoInteractions(closer, activeUserChecker);
        }

        @Test
        void shouldDoNothingWhenStompSessionIdIsMissing() {
            listener().onConnected(connectedEvent(connectMessage(adminClaims()), null));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
            verifyNoInteractions(closer, activeUserChecker);
        }
    }

    @Nested
    class Disconnect {
        @Test
        void shouldUnregisterConnection() {
            registry.register(CLINIC, USER, STOMP_SESSION, UUID.randomUUID());
            registry.register(CLINIC, USER, "other", UUID.randomUUID());

            listener().onDisconnect(disconnectEvent(adminClaims(), STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("other");
        }

        @Test
        void shouldDoNothingWhenClaimsAreMissing() {
            registry.register(CLINIC, USER, STOMP_SESSION, UUID.randomUUID());

            listener().onDisconnect(disconnectEvent(null, STOMP_SESSION));

            assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly(STOMP_SESSION);
        }
    }
}
