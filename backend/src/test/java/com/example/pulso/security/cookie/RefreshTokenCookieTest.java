package com.example.pulso.security.cookie;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.dto.login.IssuedRefreshToken;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RefreshTokenCookieTest {
    private static RefreshTokenCookie cookie(boolean secure) {
        return new RefreshTokenCookie(
                new RefreshTokenProperties(Duration.ofDays(7), Duration.ofDays(30), "refresh_token", secure, "0 0 3 * * *"));
    }

    @Test
    void shouldIssueHttpOnlySecureStrictCookieScopedToAuthPath() {
        var header = cookie(true).issue(new IssuedRefreshToken("abc", UUID.randomUUID(), Duration.ofDays(7)));

        assertThat(header)
                .startsWith("refresh_token=abc")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Strict")
                .contains("Path=/api/auth")
                .contains("Max-Age=604800");
    }

    @Test
    void shouldOmitSecureFlagWhenConfiguredNotSecure() {
        var header = cookie(false).issue(new IssuedRefreshToken("abc", UUID.randomUUID(), Duration.ofDays(1)));

        assertThat(header).doesNotContain("Secure").contains("HttpOnly");
    }

    @Test
    void shouldClearCookieWithEmptyValueAndZeroMaxAge() {
        var header = cookie(true).clear();

        assertThat(header)
                .startsWith("refresh_token=;")
                .contains("Max-Age=0")
                .contains("HttpOnly")
                .contains("Path=/api/auth")
                .contains("SameSite=Strict");
    }

    @Test
    void shouldReadCookieValueFromRequest() {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", "abc"));

        assertThat(cookie(true).read(request)).contains("abc");
    }

    @Test
    void shouldReturnEmptyWhenCookieIsMissing() {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("other", "abc"));

        assertThat(cookie(true).read(request)).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenRequestHasNoCookies() {
        assertThat(cookie(true).read(new MockHttpServletRequest())).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenCookieValueIsBlank() {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", " "));

        assertThat(cookie(true).read(request)).isEmpty();
    }
}
