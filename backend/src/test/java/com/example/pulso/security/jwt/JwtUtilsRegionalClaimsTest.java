package com.example.pulso.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtUtilsRegionalClaimsTest {
    private final Clock clock = Clock.fixed(Instant.now(), ZoneOffset.UTC);
    private final JwtUtils jwtUtil = new JwtUtils("0123456789012345678901234567890123456789", Duration.ofMinutes(15), clock);
    private final Clinic clinic = Clinic.builder()
            .id(7L)
            .name("Demo")
            .slug("demo")
            .country(SupportedCountry.BR)
            .timezone("America/Manaus")
            .defaultLanguage(ClinicLanguage.PT_BR)
            .settingsVersion(4)
            .build();
    private final Personal admin = Personal.builder().id(1L).name("admin").role(ERole.ADMINISTRATOR).version(3L).build();

    @Test
    void shouldIncludeRegionalClaimsInStaffToken() {
        var token = jwtUtil.generate(admin, clinic, UUID.randomUUID());

        var claims = jwtUtil.parse(token).orElseThrow();
        assertThat(claims.get(JwtClaims.COUNTRY, String.class)).isEqualTo("BR");
        assertThat(claims.get(JwtClaims.TIMEZONE, String.class)).isEqualTo("America/Manaus");
        assertThat(claims.get(JwtClaims.DEFAULT_LANGUAGE, String.class)).isEqualTo("pt-BR");
    }

    @Test
    void shouldIncludeVersionAndSessionClaimsInStaffToken() {
        var sessionId = UUID.randomUUID();

        var claims = jwtUtil.parse(jwtUtil.generate(admin, clinic, sessionId)).orElseThrow();

        assertThat(JwtUtils.extractUserVersion(claims)).contains(3L);
        assertThat(JwtUtils.extractSettingsVersion(claims)).contains(4);
        assertThat(JwtUtils.extractSessionId(claims)).contains(sessionId);
    }

    @Test
    void shouldNotIncludeVersionAndSessionClaimsInGuestToken() {
        var claims = jwtUtil.parse(jwtUtil.generateGuest(clinic)).orElseThrow();

        assertThat(JwtUtils.extractUserVersion(claims)).isEmpty();
        assertThat(JwtUtils.extractSettingsVersion(claims)).isEmpty();
        assertThat(JwtUtils.extractSessionId(claims)).isEmpty();
    }

    @Test
    void shouldIncludeRegionalClaimsInGuestToken() {
        var token = jwtUtil.generateGuest(clinic);

        var claims = jwtUtil.parse(token).orElseThrow();
        assertThat(claims.get(JwtClaims.COUNTRY, String.class)).isEqualTo("BR");
        assertThat(claims.get(JwtClaims.TIMEZONE, String.class)).isEqualTo("America/Manaus");
        assertThat(claims.get(JwtClaims.DEFAULT_LANGUAGE, String.class)).isEqualTo("pt-BR");
    }

    private static Claims claimsWithTimezone(String timezone) {
        var builder = Jwts.claims().subject("1");
        if (timezone != null) builder.add(JwtClaims.TIMEZONE, timezone);
        return builder.build();
    }

    @Test
    void shouldExtractZoneFromValidClaim() {
        assertThat(JwtUtils.extractZone(claimsWithTimezone("America/Sao_Paulo")))
                .isEqualTo(ZoneId.of("America/Sao_Paulo"));
    }

    private static Claims claimsWithCountry(String country) {
        var builder = Jwts.claims().subject("1");
        if (country != null) builder.add(JwtClaims.COUNTRY, country);
        return builder.build();
    }

    @Test
    void shouldExtractCountryFromValidClaim() {
        assertThat(JwtUtils.extractCountry(claimsWithCountry("BR"))).isEqualTo(SupportedCountry.BR);
    }

}
