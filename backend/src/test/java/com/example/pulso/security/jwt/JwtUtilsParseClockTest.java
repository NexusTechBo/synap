package com.example.pulso.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtUtilsParseClockTest {
    private static final String SECRET = "0123456789012345678901234567890123456789";
    private static final Instant ISSUED_AT = Instant.parse("2026-11-04T10:00:00Z");
    private static final Duration ACCESS_TTL = Duration.ofMinutes(15);

    private final Clinic clinic = Clinic.builder()
            .id(7L)
            .name("Demo")
            .slug("demo")
            .country(SupportedCountry.BO)
            .timezone("America/La_Paz")
            .defaultLanguage(ClinicLanguage.ES)
            .build();
    private final Personal admin = Personal.builder().id(1L).name("admin").role(ERole.ADMINISTRATOR).version(0L).build();

    private static JwtUtils jwtUtilAt(Instant instant) {
        return new JwtUtils(SECRET, ACCESS_TTL, Clock.fixed(instant, ZoneOffset.UTC));
    }

    private String tokenIssuedAtFixedInstant() {
        return jwtUtilAt(ISSUED_AT).generate(admin, clinic, UUID.randomUUID());
    }

    @Test
    void shouldParseTokenBeforeExpirationAccordingToClock() {
        var token = tokenIssuedAtFixedInstant();

        assertThat(jwtUtilAt(ISSUED_AT.plus(ACCESS_TTL).minusSeconds(1)).parse(token)).isPresent();
    }

    @Test
    void shouldRejectTokenAfterExpirationAccordingToClock() {
        var token = tokenIssuedAtFixedInstant();

        assertThat(jwtUtilAt(ISSUED_AT.plus(ACCESS_TTL).plusSeconds(1)).parse(token)).isEmpty();
    }

    @Test
    void shouldRejectGuestTokenAfterGuestTtlAccordingToClock() {
        var token = jwtUtilAt(ISSUED_AT).generateGuest(clinic);

        assertThat(jwtUtilAt(ISSUED_AT.plus(JwtUtils.GUEST_TTL).minusSeconds(1)).parse(token)).isPresent();
        assertThat(jwtUtilAt(ISSUED_AT.plus(JwtUtils.GUEST_TTL).plusSeconds(1)).parse(token)).isEmpty();
    }

    @Test
    void shouldRejectTokenSignedWithAnotherKey() {
        var token = new JwtUtils("abcdefghijabcdefghijabcdefghijabcdefghij", ACCESS_TTL, Clock.fixed(ISSUED_AT, ZoneOffset.UTC))
                .generate(admin, clinic, UUID.randomUUID());

        assertThat(jwtUtilAt(ISSUED_AT).parse(token)).isEmpty();
    }

    @Test
    void shouldRejectMalformedToken() {
        assertThat(jwtUtilAt(ISSUED_AT).parse("not-a-jwt")).isEmpty();
    }
}
