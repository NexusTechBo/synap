package com.example.pulso.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.ERole;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.RoleProfile;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtil;
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
    private JwtUtil jwtUtil;

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
    void shouldRejectConnectWhenTimezoneClaimIsMissing() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims(null)));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class);

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldRejectConnectWhenTimezoneClaimIsInvalid() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("Mars/Olympus")));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class);

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldRejectConnectWhenCountryClaimIsMissing() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", null)));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class);

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldRejectConnectWhenCountryClaimIsInvalid() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz", "XX")));

        assertThatThrownBy(() -> interceptor().preSend(connect(new HashMap<>()), channel))
                .isInstanceOf(MessageDeliveryException.class);

        assertThat(TenantContext.current()).isNull();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldAcceptConnectWithValidTimezoneAndLeaveTenantCleared() {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims("America/La_Paz")));
        when(activeUserChecker.isActive(anyLong(), any(RoleProfile.class))).thenReturn(true);
        var attributes = new HashMap<String, Object>();

        var result = interceptor().preSend(connect(attributes), channel);

        assertThat(result).isNotNull();
        assertThat(attributes).containsEntry(JwtChannelInterceptor.CLINIC_ID_ATTRIBUTE, 7L);
        assertThat(TenantContext.current()).isNull();
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
        when(activeUserChecker.isActive(1L, new RoleProfile(ERole.DOCTOR, false))).thenReturn(true);

        var result = interceptor().preSend(connect(new HashMap<>()), channel);

        assertThat(result).isNotNull();
    }
}
