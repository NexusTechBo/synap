package com.example.pulso.security.jwt;

import com.example.pulso.entity.Clinic;
import com.example.pulso.entity.Personal;
import com.example.pulso.enums.ERole;
import com.example.pulso.enums.SupportedCountry;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtils {
    public static final String GUEST_SUBJECT = "0";
    public static final Duration GUEST_TTL = Duration.ofMinutes(30);

    private final SecretKey key;
    private final Clock clock;
    private final Duration accessTtl;

    public JwtUtils(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-ttl:15m}") Duration accessTtl,
            Clock clock) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtl = accessTtl;
        this.clock = clock;
    }

    public String generate(Personal personal, Clinic clinic, UUID sessionId) {
        var now = clock.instant();
        return Jwts.builder()
                .subject(personal.getId().toString())
                .claim(JwtClaims.ROLES, personal.getRoles().stream().map(ERole::name).sorted().toList())
                .claim(JwtClaims.CLINIC_ID, clinic.getId())
                .claim(JwtClaims.CLINIC_NAME, clinic.getName())
                .claim(JwtClaims.CLINIC_SLUG, clinic.getSlug())
                .claim(JwtClaims.COUNTRY, clinic.getCountry().name())
                .claim(JwtClaims.TIMEZONE, clinic.getTimezone())
                .claim(JwtClaims.DEFAULT_LANGUAGE, clinic.getDefaultLanguage().code())
                .claim(JwtClaims.USERNAME, personal.getName())
                .claim(JwtClaims.USER_VERSION, personal.getVersion())
                .claim(JwtClaims.SETTINGS_VERSION, clinic.getSettingsVersion())
                .claim(JwtClaims.SESSION_ID, sessionId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
    }

    public String generateGuest(Clinic clinic) {
        var now = clock.instant();
        return Jwts.builder()
                .subject(GUEST_SUBJECT)
                .claim(JwtClaims.ROLES, List.of(ERole.GUEST.name()))
                .claim(JwtClaims.CLINIC_ID, clinic.getId())
                .claim(JwtClaims.CLINIC_NAME, clinic.getName())
                .claim(JwtClaims.CLINIC_SLUG, clinic.getSlug())
                .claim(JwtClaims.COUNTRY, clinic.getCountry().name())
                .claim(JwtClaims.TIMEZONE, clinic.getTimezone())
                .claim(JwtClaims.DEFAULT_LANGUAGE, clinic.getDefaultLanguage().code())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(GUEST_TTL)))
                .signWith(key)
                .compact();
    }

    public Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException _) {
            return Optional.empty();
        }
    }

    public static String extractClinicSlug(Claims claims){
        return claims.get(JwtClaims.CLINIC_SLUG, String.class);
    }

    public static Long extractClinicId(Claims claims) {
        return claims.get(JwtClaims.CLINIC_ID, Long.class);
    }

    public static ZoneId extractZone(Claims claims) {
        return ZoneId.of(claims.get(JwtClaims.TIMEZONE, String.class));
    }

    public static SupportedCountry extractCountry(Claims claims) {
        return SupportedCountry.fromCode(claims.get(JwtClaims.COUNTRY, String.class)).orElseThrow();
    }

    public static Optional<Long> extractUserVersion(Claims claims) {
        return Optional.ofNullable(claims.get(JwtClaims.USER_VERSION, Long.class));
    }

    public static Optional<Integer> extractSettingsVersion(Claims claims) {
        return Optional.ofNullable(claims.get(JwtClaims.SETTINGS_VERSION, Integer.class));
    }

    public static Optional<UUID> extractSessionId(Claims claims) {
        return Optional.ofNullable(claims.get(JwtClaims.SESSION_ID, String.class)).map(UUID::fromString);
    }

    public static List<String> extractRoles(Claims claims) {
        if (!(claims.get(JwtClaims.ROLES) instanceof Collection<?> roles)) return List.of();
        return roles.stream().filter(Objects::nonNull).map(Object::toString).toList();
    }
}
