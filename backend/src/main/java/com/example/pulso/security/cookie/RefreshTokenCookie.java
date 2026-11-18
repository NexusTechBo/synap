package com.example.pulso.security.cookie;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.dto.login.IssuedRefreshToken;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookie {
    private static final String PATH = "/api/auth";
    private static final String SAME_SITE = "Strict";

    private final RefreshTokenProperties properties;

    public String issue(IssuedRefreshToken token) {
        return build(token.token(), token.maxAge()).toString();
    }

    public String clear() {
        return build("", Duration.ZERO).toString();
    }

    public Optional<String> read(HttpServletRequest request) {
        return Optional.ofNullable(WebUtils.getCookie(request, properties.cookieName()))
                .map(Cookie::getValue)
                .filter(StringUtils::hasText);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(properties.cookieName(), value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite(SAME_SITE)
                .path(PATH)
                .maxAge(maxAge)
                .build();
    }
}
