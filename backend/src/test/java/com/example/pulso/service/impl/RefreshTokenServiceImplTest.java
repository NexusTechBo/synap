package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.entity.RefreshToken;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.repository.RefreshTokenRepository;
import com.example.pulso.util.TokenUtils;
import com.example.pulso.websocket.event.UserSessionsRevokedEvent;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 4, 10, 0);
    private static final Clock CLOCK = Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private static final Duration TTL = Duration.ofDays(7);
    private static final Duration ABSOLUTE_TTL = Duration.ofDays(30);
    private static final Long CLINIC_ID = 7L;
    private static final Long USER_ID = 5L;
    private static final String RAW = "raw-token";

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private RefreshTokenServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenServiceImpl(
                refreshTokenRepository,
                new RefreshTokenProperties(TTL, ABSOLUTE_TTL, "refresh_token", true, "0 0 3 * * *"),
                CLOCK,
                eventPublisher);
    }

    private RefreshToken storedToken(LocalDateTime expiresAt, LocalDateTime familyExpiresAt, LocalDateTime revokedAt) {
        return RefreshToken.builder()
                .id(1L)
                .tokenHash(TokenUtils.hash(RAW))
                .familyId(UUID.randomUUID())
                .clinicId(CLINIC_ID)
                .userId(USER_ID)
                .expiresAt(expiresAt)
                .familyExpiresAt(familyExpiresAt)
                .createdAt(NOW.minusDays(1))
                .revokedAt(revokedAt)
                .build();
    }

    private RefreshToken savedToken() {
        var captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        return captor.getValue();
    }

    private void givenStored(RefreshToken token) {
        when(refreshTokenRepository.findByTokenHashForUpdate(TokenUtils.hash(RAW))).thenReturn(Optional.of(token));
    }

    private static void assertInvalid(Throwable thrown) {
        assertThat(thrown).isInstanceOf(UnauthorizedException.class);
        assertThat(((UnauthorizedException) thrown).getMessageKey()).isEqualTo(MessageKeys.AUTH_REFRESH_INVALID);
    }

    @Nested
    class Issue {
        @Test
        void shouldCreateNewFamilyWithSlidingAndAbsoluteExpiry() {
            var issued = service.issue(CLINIC_ID, USER_ID);

            var saved = savedToken();
            assertThat(saved.getFamilyId()).isEqualTo(issued.familyId());
            assertThat(saved.getClinicId()).isEqualTo(CLINIC_ID);
            assertThat(saved.getUserId()).isEqualTo(USER_ID);
            assertThat(saved.getCreatedAt()).isEqualTo(NOW);
            assertThat(saved.getExpiresAt()).isEqualTo(NOW.plus(TTL));
            assertThat(saved.getFamilyExpiresAt()).isEqualTo(NOW.plus(ABSOLUTE_TTL));
            assertThat(saved.getRevokedAt()).isNull();
            assertThat(issued.maxAge()).isEqualTo(TTL);
        }

        @Test
        void shouldStoreOnlyTheHashAndNeverTheRawToken() {
            var issued = service.issue(CLINIC_ID, USER_ID);

            var saved = savedToken();
            assertThat(saved.getTokenHash()).isEqualTo(TokenUtils.hash(issued.token()));
            assertThat(saved.getTokenHash()).isNotEqualTo(issued.token());
        }

        @Test
        void shouldGenerateDifferentFamilyAndTokenOnEachCall() {
            var first = service.issue(CLINIC_ID, USER_ID);
            var second = service.issue(CLINIC_ID, USER_ID);

            assertThat(first.familyId()).isNotEqualTo(second.familyId());
            assertThat(first.token()).isNotEqualTo(second.token());
        }
    }

    @Nested
    class Rotate {
        @Test
        void shouldRevokeCurrentAndIssueNewTokenInSameFamily() {
            var current = storedToken(NOW.plusDays(3), NOW.plusDays(20), null);
            givenStored(current);

            var rotated = service.rotate(RAW);

            assertThat(current.getRevokedAt()).isEqualTo(NOW);
            var saved = savedToken();
            assertThat(saved.getFamilyId()).isEqualTo(current.getFamilyId());
            assertThat(saved.getTokenHash()).isNotEqualTo(current.getTokenHash());
            assertThat(saved.getExpiresAt()).isEqualTo(NOW.plus(TTL));
            assertThat(saved.getFamilyExpiresAt()).isEqualTo(current.getFamilyExpiresAt());
            assertThat(rotated.clinicId()).isEqualTo(CLINIC_ID);
            assertThat(rotated.userId()).isEqualTo(USER_ID);
            assertThat(rotated.token().familyId()).isEqualTo(current.getFamilyId());
            assertThat(rotated.token().token()).isNotEqualTo(RAW);
            assertThat(rotated.token().maxAge()).isEqualTo(TTL);
        }

        @Test
        void shouldCapNewTokenExpiryAtTheAbsoluteLimitOfTheFamily() {
            var current = storedToken(NOW.plusDays(3), NOW.plusDays(2), null);
            givenStored(current);

            var rotated = service.rotate(RAW);

            assertThat(savedToken().getExpiresAt()).isEqualTo(NOW.plusDays(2));
            assertThat(rotated.token().maxAge()).isEqualTo(Duration.ofDays(2));
        }

        @Test
        void shouldRejectWhenTokenIsNull() {
            var thrown = catchThrowable(() -> service.rotate(null));

            assertInvalid(thrown);
            verifyNoInteractions(refreshTokenRepository);
        }

        @Test
        void shouldRejectWhenTokenIsBlank() {
            var thrown = catchThrowable(() -> service.rotate("  "));

            assertInvalid(thrown);
            verifyNoInteractions(refreshTokenRepository);
        }

        @Test
        void shouldRejectWhenTokenIsUnknown() {
            when(refreshTokenRepository.findByTokenHashForUpdate(TokenUtils.hash(RAW))).thenReturn(Optional.empty());

            var thrown = catchThrowable(() -> service.rotate(RAW));

            assertInvalid(thrown);
            verify(refreshTokenRepository, never()).save(any());
            verify(refreshTokenRepository, never()).revokeFamily(any(), any());
        }

        @Test
        void shouldRevokeWholeFamilyAndRejectWhenTokenWasAlreadyRevoked() {
            var current = storedToken(NOW.plusDays(3), NOW.plusDays(20), NOW.minusHours(1));
            givenStored(current);

            var thrown = catchThrowable(() -> service.rotate(RAW));

            assertInvalid(thrown);
            verify(refreshTokenRepository).revokeFamily(current.getFamilyId(), NOW);
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        void shouldRejectWithoutRevokingFamilyWhenTokenIsExpired() {
            var current = storedToken(NOW.minusSeconds(1), NOW.plusDays(20), null);
            givenStored(current);

            var thrown = catchThrowable(() -> service.rotate(RAW));

            assertInvalid(thrown);
            assertThat(current.getRevokedAt()).isNull();
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        void shouldRejectWhenTokenExpiresExactlyNow() {
            givenStored(storedToken(NOW, NOW.plusDays(20), null));

            assertInvalid(catchThrowable(() -> service.rotate(RAW)));
        }

        @Test
        void shouldRejectWhenAbsoluteLimitOfFamilyWasReached() {
            givenStored(storedToken(NOW.minusSeconds(1), NOW.minusSeconds(1), null));

            assertInvalid(catchThrowable(() -> service.rotate(RAW)));
            verify(refreshTokenRepository, never()).save(any());
        }
    }

    @Nested
    class Revocation {
        @Test
        void shouldRevokeFamilyWithCurrentTime() {
            var familyId = UUID.randomUUID();

            service.revokeFamily(familyId);

            verify(refreshTokenRepository).revokeFamily(familyId, NOW);
        }

        @Test
        void shouldRevokeFamilyOfKnownToken() {
            var token = storedToken(NOW.plusDays(1), NOW.plusDays(30), null);
            givenStored(token);

            service.revokeFamilyOfToken(RAW);

            verify(refreshTokenRepository).revokeFamily(token.getFamilyId(), NOW);
        }

        @Test
        void shouldLockTokenRowByHashBeforeRevokingItsFamily() {
            var token = storedToken(NOW.plusDays(1), NOW.plusDays(30), null);
            givenStored(token);

            service.revokeFamilyOfToken(RAW);

            var order = inOrder(refreshTokenRepository);
            order.verify(refreshTokenRepository).findByTokenHashForUpdate(TokenUtils.hash(RAW));
            order.verify(refreshTokenRepository).revokeFamily(token.getFamilyId(), NOW);
            verifyNoMoreInteractions(refreshTokenRepository);
        }

        @Test
        void shouldDoNothingWhenTokenIsUnknown() {
            when(refreshTokenRepository.findByTokenHashForUpdate(TokenUtils.hash(RAW))).thenReturn(Optional.empty());

            var thrown = catchThrowable(() -> service.revokeFamilyOfToken(RAW));

            assertThat(thrown).isNull();
            verify(refreshTokenRepository).findByTokenHashForUpdate(TokenUtils.hash(RAW));
            verifyNoMoreInteractions(refreshTokenRepository);
        }

        @Test
        void shouldDoNothingWhenTokenIsNull() {
            service.revokeFamilyOfToken(null);

            verifyNoInteractions(refreshTokenRepository);
        }

        @Test
        void shouldDoNothingWhenTokenIsBlank() {
            service.revokeFamilyOfToken(" ");

            verifyNoInteractions(refreshTokenRepository);
        }

        @Test
        void shouldRevokeAllTokensOfUser() {
            service.revokeAllForUser(CLINIC_ID, USER_ID);

            verify(refreshTokenRepository).revokeAllByUser(CLINIC_ID, USER_ID, NOW);
        }

        @Test
        void shouldPublishRevocationEventWithoutKeptSessionWhenRevokingAllTokensOfUser() {
            service.revokeAllForUser(CLINIC_ID, USER_ID);

            verify(eventPublisher).publishEvent(new UserSessionsRevokedEvent(CLINIC_ID, USER_ID, null));
        }

        @Test
        void shouldPublishRevocationEventWithKeptSessionWhenRevokingAllExceptFamily() {
            var keep = UUID.randomUUID();

            service.revokeAllForUserExcept(CLINIC_ID, USER_ID, keep);

            verify(eventPublisher).publishEvent(new UserSessionsRevokedEvent(CLINIC_ID, USER_ID, keep));
        }

        @Test
        void shouldNotPublishRevocationEventWhenRevokingSingleFamily() {
            service.revokeFamily(UUID.randomUUID());

            verifyNoInteractions(eventPublisher);
        }

        @Test
        void shouldNotPublishRevocationEventWhenRevokingFamilyOfToken() {
            givenStored(storedToken(NOW.plusDays(1), NOW.plusDays(30), null));

            service.revokeFamilyOfToken(RAW);

            verifyNoInteractions(eventPublisher);
        }

        @Test
        void shouldRevokeAllTokensOfUserExceptKeptFamily() {
            var keep = UUID.randomUUID();

            service.revokeAllForUserExcept(CLINIC_ID, USER_ID, keep);

            verify(refreshTokenRepository).revokeAllByUserExceptFamily(CLINIC_ID, USER_ID, keep, NOW);
        }
    }

    @Nested
    class DeleteExpired {
        @Test
        void shouldDeleteExpiredBeforeNowAndReturnCount() {
            when(refreshTokenRepository.deleteExpired(NOW)).thenReturn(4);

            assertThat(service.deleteExpired()).isEqualTo(4);
        }
    }
}
