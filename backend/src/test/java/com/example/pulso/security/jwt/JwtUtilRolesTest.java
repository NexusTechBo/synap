package com.example.pulso.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class JwtUtilRolesTest {
    private static final String SECRET = "0123456789012345678901234567890123456789";
    private static final String LEGACY_ROLE_CLAIM = "role";

    private final Instant now = Instant.now();
    private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
    private final JwtUtil jwtUtil = new JwtUtil(SECRET, clock);
    private final Clinic clinic = Clinic.builder()
            .id(7L)
            .name("Demo")
            .slug("demo")
            .country(SupportedCountry.BO)
            .timezone("America/La_Paz")
            .defaultLanguage(ClinicLanguage.ES)
            .build();

    private String tokenWithClaim(String name, Object value) {
        var builder = Jwts.builder()
                .subject("1")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)));
        if (name != null) builder.claim(name, value);
        return builder.compact();
    }

    private Claims parsed(String token) {
        return jwtUtil.parse(token).orElseThrow();
    }

    @Nested
    class Generate {
        @Test
        void shouldEmitRolesClaimAndNoLegacyRoleClaimForStaff() {
            var claims = parsed(jwtUtil.generate(1L, List.of(ERole.ADMINISTRATOR), clinic, "admin"));

            assertThat(claims.get(JwtClaims.ROLES)).isEqualTo(List.of("ADMINISTRATOR"));
            assertThat(claims).doesNotContainKey(LEGACY_ROLE_CLAIM);
        }

        @Test
        void shouldEmitSortedRolesForAdministratorAndDoctor() {
            var claims = parsed(jwtUtil.generate(1L, List.of(ERole.DOCTOR, ERole.ADMINISTRATOR), clinic, "admin"));

            assertThat(JwtUtil.extractRoles(claims)).containsExactly("ADMINISTRATOR", "DOCTOR");
        }

        @Test
        void shouldEmitGuestRoleAndNoLegacyRoleClaimForGuest() {
            var claims = parsed(jwtUtil.generateGuest(clinic));

            assertThat(claims.get(JwtClaims.ROLES)).isEqualTo(List.of("GUEST"));
            assertThat(claims).doesNotContainKey(LEGACY_ROLE_CLAIM);
        }
    }

    @Nested
    class ExtractRoles {
        @Test
        void shouldReturnEmptyWhenRolesClaimIsMissing() {
            assertThat(JwtUtil.extractRoles(parsed(tokenWithClaim(null, null)))).isEmpty();
        }

        @Test
        void shouldReturnEmptyWhenRolesClaimIsNotACollection() {
            assertThat(JwtUtil.extractRoles(parsed(tokenWithClaim(JwtClaims.ROLES, "ADMINISTRATOR")))).isEmpty();
        }

        @Test
        void shouldReturnEmptyWhenRolesClaimIsAnEmptyCollection() {
            assertThat(JwtUtil.extractRoles(parsed(tokenWithClaim(JwtClaims.ROLES, List.of())))).isEmpty();
        }

        @Test
        void shouldReturnEmptyWhenTokenOnlyHasLegacyRoleClaim() {
            assertThat(JwtUtil.extractRoles(parsed(tokenWithClaim(LEGACY_ROLE_CLAIM, "ADMINISTRATOR")))).isEmpty();
        }

        @Test
        void shouldReturnRolesWhenClaimIsACollection() {
            var token = tokenWithClaim(JwtClaims.ROLES, List.of("DOCTOR"));

            assertThat(JwtUtil.extractRoles(parsed(token))).containsExactly("DOCTOR");
        }
    }
}
