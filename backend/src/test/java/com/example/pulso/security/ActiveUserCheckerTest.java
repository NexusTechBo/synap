package com.example.pulso.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.enums.ERole;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.security.cache.ClinicSettingsVersionCache;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.profile.RoleProfile;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ActiveUserCheckerTest {
    private static final RoleProfile DOCTOR = new RoleProfile(ERole.DOCTOR);

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private ClinicSettingsVersionCache settingsVersionCache;

    @InjectMocks
    private ActiveUserChecker checker;

    private static Claims staffClaims(Long userVersion, Integer settingsVersion, UUID sessionId) {
        var builder = Jwts.claims().subject("5").add(JwtClaims.CLINIC_ID, 7L);
        if (userVersion != null) builder.add(JwtClaims.USER_VERSION, userVersion);
        if (settingsVersion != null) builder.add(JwtClaims.SETTINGS_VERSION, settingsVersion);
        if (sessionId != null) builder.add(JwtClaims.SESSION_ID, sessionId.toString());
        return builder.build();
    }

    @Test
    void shouldBeValidWithoutQueryingAnythingWhenProfileIsGuest() {
        var status = checker.check(Jwts.claims().subject("0").build(), new RoleProfile(ERole.GUEST));

        assertThat(status).isEqualTo(TokenStatus.VALID);
        verifyNoInteractions(personalRepository, settingsVersionCache);
    }

    @Test
    void shouldBeValidWhenBothVersionsMatch() {
        when(personalRepository.findVersionOfActiveById(5L)).thenReturn(Optional.of(3L));
        when(settingsVersionCache.get(7L)).thenReturn(Optional.of(2));

        assertThat(checker.check(staffClaims(3L, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.VALID);
    }

    @Test
    void shouldBeInvalidWhenUserIsInactiveOrMissing() {
        when(personalRepository.findVersionOfActiveById(5L)).thenReturn(Optional.empty());

        assertThat(checker.check(staffClaims(3L, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.INVALID);
        verifyNoInteractions(settingsVersionCache);
    }

    @Test
    void shouldBeStaleWhenUserVersionChanged() {
        when(personalRepository.findVersionOfActiveById(5L)).thenReturn(Optional.of(4L));
        when(settingsVersionCache.get(7L)).thenReturn(Optional.of(2));

        assertThat(checker.check(staffClaims(3L, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.STALE);
    }

    @Test
    void shouldBeStaleWhenSettingsVersionChanged() {
        when(personalRepository.findVersionOfActiveById(5L)).thenReturn(Optional.of(3L));
        when(settingsVersionCache.get(7L)).thenReturn(Optional.of(3));

        assertThat(checker.check(staffClaims(3L, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.STALE);
    }

    @Test
    void shouldBeInvalidWhenClinicDoesNotExist() {
        when(personalRepository.findVersionOfActiveById(5L)).thenReturn(Optional.of(3L));
        when(settingsVersionCache.get(7L)).thenReturn(Optional.empty());

        assertThat(checker.check(staffClaims(3L, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.INVALID);
    }

    @Test
    void shouldBeInvalidWhenTokenLacksVersionOrSessionClaims() {
        assertThat(checker.check(staffClaims(null, 2, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.INVALID);
        assertThat(checker.check(staffClaims(3L, null, UUID.randomUUID()), DOCTOR)).isEqualTo(TokenStatus.INVALID);
        assertThat(checker.check(staffClaims(3L, 2, null), DOCTOR)).isEqualTo(TokenStatus.INVALID);
        verifyNoInteractions(personalRepository, settingsVersionCache);
    }
}
