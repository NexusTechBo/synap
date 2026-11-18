package com.example.pulso.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class JwtUtilRegionalClaimsTest {
    private final Clock clock = Clock.fixed(Instant.now(), ZoneOffset.UTC);
    private final JwtUtil jwtUtil = new JwtUtil("0123456789012345678901234567890123456789", clock);
    private final Clinic clinic = Clinic.builder()
            .id(7L)
            .name("Demo")
            .slug("demo")
            .country(SupportedCountry.BR)
            .timezone("America/Manaus")
            .defaultLanguage(ClinicLanguage.PT_BR)
            .build();

    @Test
    void shouldIncludeRegionalClaimsInStaffToken() {
        var token = jwtUtil.generate(1L, List.of(ERole.ADMINISTRATOR), clinic, "admin");

        var claims = jwtUtil.parse(token).orElseThrow();
        assertThat(claims.get(JwtClaims.COUNTRY, String.class)).isEqualTo("BR");
        assertThat(claims.get(JwtClaims.TIMEZONE, String.class)).isEqualTo("America/Manaus");
        assertThat(claims.get(JwtClaims.DEFAULT_LANGUAGE, String.class)).isEqualTo("pt-BR");
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
        assertThat(JwtUtil.extractZone(claimsWithTimezone("America/Sao_Paulo")))
                .isEqualTo(ZoneId.of("America/Sao_Paulo"));
    }

    @Test
    void shouldRejectMissingTimezoneClaim() {
        assertThatThrownBy(() -> JwtUtil.extractZone(claimsWithTimezone(null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectBlankTimezoneClaim() {
        assertThatThrownBy(() -> JwtUtil.extractZone(claimsWithTimezone("   ")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectInvalidTimezoneClaim() {
        assertThatThrownBy(() -> JwtUtil.extractZone(claimsWithTimezone("Mars/Olympus")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static Claims claimsWithCountry(String country) {
        var builder = Jwts.claims().subject("1");
        if (country != null) builder.add(JwtClaims.COUNTRY, country);
        return builder.build();
    }

    @Test
    void shouldExtractCountryFromValidClaim() {
        assertThat(JwtUtil.extractCountry(claimsWithCountry("BR"))).isEqualTo(SupportedCountry.BR);
    }

    @Test
    void shouldRejectMissingCountryClaim() {
        assertThatThrownBy(() -> JwtUtil.extractCountry(claimsWithCountry(null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectBlankCountryClaim() {
        assertThatThrownBy(() -> JwtUtil.extractCountry(claimsWithCountry("  ")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectInvalidCountryClaim() {
        assertThatThrownBy(() -> JwtUtil.extractCountry(claimsWithCountry("XX")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
