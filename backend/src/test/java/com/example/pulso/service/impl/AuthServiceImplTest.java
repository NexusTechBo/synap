package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.login.IssuedRefreshToken;
import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.login.RotatedRefreshToken;
import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.ForbiddenException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.RefreshTokenService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    private static final String USERNAME = "ana@demo.com";
    private static final String PASSWORD = "secret";
    private static final String RAW_REFRESH = "raw-refresh";
    private static final Long CLINIC_ID = 7L;
    private static final Long USER_ID = 5L;

    @Mock
    private ClinicRepository clinicRepository;

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private PersonalMapper personalMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    private JwtUtils jwtUtil;
    private AuthServiceImpl service;
    private Clinic clinic;
    private Personal personal;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtils(
                "0123456789012345678901234567890123456789",
                Duration.ofMinutes(15),
                Clock.fixed(Instant.parse("2026-11-04T10:00:00Z"), ZoneOffset.UTC));
        service = new AuthServiceImpl(
                clinicRepository, personalRepository, personalMapper, passwordEncoder, jwtUtil, refreshTokenService);
        clinic = Clinic.builder()
                .id(CLINIC_ID)
                .name("Demo")
                .slug("demo")
                .status(ClinicStatus.ACTIVE)
                .country(SupportedCountry.BO)
                .timezone("America/La_Paz")
                .defaultLanguage(ClinicLanguage.ES)
                .settingsVersion(2)
                .build();
        personal = Personal.builder()
                .id(USER_ID)
                .username(USERNAME)
                .name("Ana")
                .password("hash")
                .role(ERole.ASSISTANT)
                .active(true)
                .version(3L)
                .build();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private static IssuedRefreshToken issued(UUID familyId) {
        return new IssuedRefreshToken(RAW_REFRESH, familyId, Duration.ofDays(7));
    }

    @Nested
    class Login {
        private void givenValidCredentials() {
            when(clinicRepository.findBySlug("demo")).thenReturn(Optional.of(clinic));
            when(personalRepository.findByUsername(USERNAME)).thenReturn(Optional.of(personal));
            when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(true);
        }

        @Test
        void shouldReturnAccessTokenAndRefreshTokenOfNewFamily() {
            givenValidCredentials();
            var familyId = UUID.randomUUID();
            var refresh = issued(familyId);
            when(refreshTokenService.issue(CLINIC_ID, USER_ID)).thenReturn(refresh);

            var session = service.login(new LoginRequest(USERNAME, PASSWORD));

            assertThat(session.refreshToken()).isSameAs(refresh);
            var claims = jwtUtil.parse(session.accessToken()).orElseThrow();
            assertThat(JwtUtils.extractSessionId(claims)).contains(familyId);
            assertThat(JwtUtils.extractUserVersion(claims)).contains(3L);
            assertThat(JwtUtils.extractSettingsVersion(claims)).contains(2);
        }

        @Test
        void shouldNormalizeUsernameToLowerCase() {
            givenValidCredentials();
            when(refreshTokenService.issue(CLINIC_ID, USER_ID)).thenReturn(issued(UUID.randomUUID()));

            var session = service.login(new LoginRequest("ANA@Demo.COM", PASSWORD));

            assertThat(session.accessToken()).isNotBlank();
        }

        @Test
        void shouldRestoreTenantContextAfterLogin() {
            givenValidCredentials();
            when(refreshTokenService.issue(CLINIC_ID, USER_ID)).thenReturn(issued(UUID.randomUUID()));

            service.login(new LoginRequest(USERNAME, PASSWORD));

            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldNotIssueRefreshTokenWhenPasswordIsWrong() {
            when(clinicRepository.findBySlug("demo")).thenReturn(Optional.of(clinic));
            when(personalRepository.findByUsername(USERNAME)).thenReturn(Optional.of(personal));
            when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(false);

            var thrown = catchThrowable(() -> service.login(new LoginRequest(USERNAME, PASSWORD)));

            assertThat(thrown).isInstanceOf(UnauthorizedException.class);
            assertThat(((UnauthorizedException) thrown).getMessageKey()).isEqualTo(MessageKeys.AUTH_INVALID_CREDENTIALS);
            verify(refreshTokenService, never()).issue(any(), any());
        }

        @Test
        void shouldNotIssueRefreshTokenWhenUserIsInactive() {
            personal.setActive(false);
            givenValidCredentials();

            var thrown = catchThrowable(() -> service.login(new LoginRequest(USERNAME, PASSWORD)));

            assertThat(thrown).isInstanceOf(UnauthorizedException.class);
            assertThat(((UnauthorizedException) thrown).getMessageKey()).isEqualTo(MessageKeys.AUTH_USER_NOT_ACTIVE);
            verify(refreshTokenService, never()).issue(any(), any());
        }

        @Test
        void shouldNotIssueRefreshTokenWhenClinicIsNotActive() {
            clinic.setStatus(ClinicStatus.PENDING_ACTIVATION);
            givenValidCredentials();

            var thrown = catchThrowable(() -> service.login(new LoginRequest(USERNAME, PASSWORD)));

            assertThat(thrown).isInstanceOf(ForbiddenException.class);
            verify(refreshTokenService, never()).issue(any(), any());
        }

        @Test
        void shouldNotIssueRefreshTokenWhenClinicDoesNotExist() {
            when(clinicRepository.findBySlug("demo")).thenReturn(Optional.empty());

            var thrown = catchThrowable(() -> service.login(new LoginRequest(USERNAME, PASSWORD)));

            assertThat(thrown).isInstanceOf(UnauthorizedException.class);
            verify(refreshTokenService, never()).issue(any(), any());
        }
    }

    @Nested
    class Refresh {
        private final UUID familyId = UUID.randomUUID();

        private void givenRotated() {
            when(refreshTokenService.rotate(RAW_REFRESH))
                    .thenReturn(new RotatedRefreshToken(issued(familyId), CLINIC_ID, USER_ID));
        }

        private void assertRejectedWithFamilyRevoked(Throwable thrown) {
            assertThat(thrown).isInstanceOf(UnauthorizedException.class);
            assertThat(((UnauthorizedException) thrown).getMessageKey()).isEqualTo(MessageKeys.AUTH_REFRESH_INVALID);
            verify(refreshTokenService).revokeFamily(familyId);
        }

        @Test
        void shouldIssueAccessTokenWithCurrentClaimsAndRotatedRefreshToken() {
            givenRotated();
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(personalRepository.findById(USER_ID)).thenReturn(Optional.of(personal));

            var session = service.refresh(RAW_REFRESH);

            assertThat(session.refreshToken().familyId()).isEqualTo(familyId);
            var claims = jwtUtil.parse(session.accessToken()).orElseThrow();
            assertThat(claims.getSubject()).isEqualTo("5");
            assertThat(JwtUtils.extractSessionId(claims)).contains(familyId);
            assertThat(JwtUtils.extractUserVersion(claims)).contains(3L);
            assertThat(JwtUtils.extractSettingsVersion(claims)).contains(2);
            assertThat(JwtUtils.extractRoles(claims)).containsExactly("ASSISTANT");
            verify(refreshTokenService, never()).revokeFamily(any());
        }

        @Test
        void shouldRestoreTenantContextAfterRefresh() {
            givenRotated();
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(personalRepository.findById(USER_ID)).thenReturn(Optional.of(personal));

            service.refresh(RAW_REFRESH);

            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldRevokeFamilyAndRejectWhenClinicIsNotActive() {
            givenRotated();
            clinic.setStatus(ClinicStatus.PENDING_ACTIVATION);
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));

            assertRejectedWithFamilyRevoked(catchThrowable(() -> service.refresh(RAW_REFRESH)));
        }

        @Test
        void shouldRevokeFamilyAndRejectWhenClinicDoesNotExist() {
            givenRotated();
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.empty());

            assertRejectedWithFamilyRevoked(catchThrowable(() -> service.refresh(RAW_REFRESH)));
        }

        @Test
        void shouldRevokeFamilyAndRejectWhenUserIsInactive() {
            givenRotated();
            personal.setActive(false);
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(personalRepository.findById(USER_ID)).thenReturn(Optional.of(personal));

            assertRejectedWithFamilyRevoked(catchThrowable(() -> service.refresh(RAW_REFRESH)));
            assertThat(TenantContext.current()).isNull();
        }

        @Test
        void shouldRevokeFamilyAndRejectWhenUserDoesNotExist() {
            givenRotated();
            when(clinicRepository.findById(CLINIC_ID)).thenReturn(Optional.of(clinic));
            when(personalRepository.findById(USER_ID)).thenReturn(Optional.empty());

            assertRejectedWithFamilyRevoked(catchThrowable(() -> service.refresh(RAW_REFRESH)));
        }

        @Test
        void shouldPropagateRejectionWithoutTouchingRepositoriesWhenRotationFails() {
            var failure = new UnauthorizedException(MessageKeys.AUTH_REFRESH_INVALID);
            when(refreshTokenService.rotate(RAW_REFRESH)).thenThrow(failure);

            var thrown = catchThrowable(() -> service.refresh(RAW_REFRESH));

            assertThat(thrown).isSameAs(failure);
            verify(clinicRepository, never()).findById(any());
            verify(refreshTokenService, never()).revokeFamily(any());
        }
    }

    @Nested
    class Logout {
        @Test
        void shouldRevokeFamilyOfTheRefreshToken() {
            service.logout(RAW_REFRESH);

            verify(refreshTokenService).revokeFamilyOfToken(RAW_REFRESH);
        }

        @Test
        void shouldDelegateNullTokenWithoutFailing() {
            service.logout(null);

            verify(refreshTokenService).revokeFamilyOfToken(null);
        }
    }
}
