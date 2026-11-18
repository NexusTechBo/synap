package com.example.pulso.websocket.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.security.profile.RoleProfile;
import com.example.pulso.security.util.SecurityUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

@ExtendWith(MockitoExtension.class)
class JwtChannelInterceptorTest {
    private static final Instant NOW = Instant.parse("2026-11-17T14:00:00Z");
    private static final String TOKEN = "token";

    @Mock
    private JwtUtils jwtUtil;

    @Mock
    private ActiveUserChecker activeUserChecker;

    @Mock
    private MessageChannel channel;

    private JwtChannelInterceptor interceptor() {
        return new JwtChannelInterceptor(jwtUtil, activeUserChecker, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Claims claims(String timezone) {
        return claims(timezone, "BO");
    }

    private Claims claims(String timezone, String country) {
        return claims(timezone, country, List.of("ADMINISTRATOR"));
    }

    private Claims claims(String timezone, String country, List<String> roles) {
        var builder = Jwts.claims()
                .subject("1")
                .add(JwtClaims.ROLES, roles)
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .expiration(Date.from(NOW.plusSeconds(3600)));
        if (timezone != null) builder.add(JwtClaims.TIMEZONE, timezone);
        if (country != null) builder.add(JwtClaims.COUNTRY, country);
        return builder.build();
    }

    private Message<byte[]> connect(HashMap<String, Object> sessionAttributes) {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer " + TOKEN);
        accessor.setSessionAttributes(sessionAttributes);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void shouldAcceptConnectWithValidTimezoneAndLeaveTenantCleared() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz")));
        when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.VALID);
        var attributes = new HashMap<String, Object>();

        var result = interceptor().preSend(connect(attributes), channel);

        assertThat(result).isNotNull();
        assertThat(attributes).containsEntry(JwtChannelInterceptor.CLINIC_ID_ATTRIBUTE, 7L);
        assertThat(TenantContext.current()).isNull();
    }

    @Test
    void shouldStoreClaimsInSessionAttributesAfterValidConnect() {
        var claims = claims("America/La_Paz");
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims));
        when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.VALID);
        var attributes = new HashMap<String, Object>();

        interceptor().preSend(connect(attributes), channel);

        assertThat(attributes).containsEntry(JwtChannelInterceptor.CLAIMS_ATTRIBUTE, claims);
    }

    @Test
    void shouldRejectConnectWithInvalidTokenWhenRolesAreNotAllowedCombination() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", "BO", List.of("ASSISTANT", "DOCTOR"))));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Invalid token");

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldRejectConnectWithInvalidTokenWhenRolesAreEmpty() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", "BO", List.of())));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Invalid token");

        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldRejectGuestConnectBeforeSettingTenant() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", "BO", List.of("GUEST"))));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Guests cannot connect");

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldAcceptConnectOfDoctorWithDoctorRole() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", "BO", List.of("DOCTOR"))));
        when(activeUserChecker.check(any(Claims.class), eq(new RoleProfile(ERole.DOCTOR)))).thenReturn(TokenStatus.VALID);

        var result = interceptor().preSend(connect(new HashMap<>()), channel);

        assertThat(result).isNotNull();
    }

    @Test
    void shouldRejectConnectWithStaleTokenMessageWhenCheckerReportsStale() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz")));
        when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.STALE);

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Stale token");

        assertThat(TenantContext.current()).isNull();
    }

    @Test
    void shouldRejectConnectWithInvalidTokenMessageWhenCheckerReportsInvalid() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz")));
        when(activeUserChecker.check(any(Claims.class), any(RoleProfile.class))).thenReturn(TokenStatus.INVALID);

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Invalid token");
    }

    @Nested
    class SessionTopicSubscription {
        private Message<byte[]> subscribe(String destination, Long clinicId, String userId, List<String> roles) {
            var accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
            accessor.setDestination(destination);
            var attributes = new HashMap<String, Object>();
            attributes.put(JwtChannelInterceptor.CLINIC_ID_ATTRIBUTE, clinicId);
            attributes.put(JwtChannelInterceptor.TOKEN_EXPIRES_AT_ATTRIBUTE, NOW.plusSeconds(60));
            accessor.setSessionAttributes(attributes);
            accessor.setUser(SecurityUtils.authenticated(userId, roles));
            accessor.setLeaveMutable(true);
            return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        }

        @Test
        void shouldAllowAdministratorToSubscribeToOwnClinicSessionTopic() {
            var result = interceptor().preSend(subscribe("/topic/clinic/7/session", 7L, "1", List.of("ADMINISTRATOR")), channel);

            assertThat(result).isNotNull();
        }

        @Test
        void shouldAllowRestrictedDoctorToSubscribeToOwnClinicSessionTopic() {
            var result = interceptor().preSend(subscribe("/topic/clinic/7/session", 7L, "2", List.of("DOCTOR")), channel);

            assertThat(result).isNotNull();
        }

        @Test
        void shouldAllowAssistantToSubscribeToOwnClinicSessionTopic() {
            var result = interceptor().preSend(subscribe("/topic/clinic/7/session", 7L, "3", List.of("ASSISTANT")), channel);

            assertThat(result).isNotNull();
        }

        @Test
        void shouldRejectSubscriptionToSessionTopicOfAnotherClinic() {
            assertThatThrownBy(() -> interceptor().preSend(
                            subscribe("/topic/clinic/8/session", 7L, "1", List.of("ADMINISTRATOR")), channel))
                    .isInstanceOf(MessageDeliveryException.class)
                    .hasMessageContaining("Forbidden destination");
        }

        @Test
        void shouldRejectRestrictedDoctorSubscribingToClinicBoard() {
            assertThatThrownBy(() -> interceptor().preSend(
                            subscribe("/topic/clinic/7/board", 7L, "2", List.of("DOCTOR")), channel))
                    .isInstanceOf(MessageDeliveryException.class)
                    .hasMessageContaining("Forbidden destination");
        }
    }
}
