package com.example.pulso.controller;

import static com.example.pulso.controller.SliceTokens.ADMIN_TOKEN;
import static com.example.pulso.controller.SliceTokens.as;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.config.refreshtoken.RefreshTokenProperties;
import com.example.pulso.dto.login.AuthSession;
import com.example.pulso.dto.login.IssuedRefreshToken;
import com.example.pulso.enums.TokenStatus;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.UnauthorizedException;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.cookie.RefreshTokenCookie;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.AuthService;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AuthController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    RefreshTokenCookie.class,
    AuthControllerTest.SliceSecurityConfig.class
})
class AuthControllerTest {
    private static final String LOGIN_BODY = """
            {"username":"ana@demo.com","password":"secret"}
            """;
    private static final UUID FAMILY_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtUtils jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    @BeforeEach
    void setUpTokens() {
        SliceTokens.givenStandardTokens(jwtUtil, activeUserChecker);
    }

    @TestConfiguration
    @EnableConfigurationProperties({RateLimitProperties.class, RefreshTokenProperties.class})
    static class SliceSecurityConfig {}

    private static AuthSession session(String accessToken, String refreshToken) {
        return new AuthSession(accessToken, new IssuedRefreshToken(refreshToken, FAMILY_ID, Duration.ofDays(7)));
    }

    @Nested
    class Login {
        @Test
        void shouldReturnAccessTokenInBodyAndRefreshTokenOnlyInCookie() throws Exception {
            when(authService.login(any())).thenReturn(session("access-1", "refresh-1"));

            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value("access-1"))
                    .andExpect(jsonPath("$.refreshToken").doesNotExist())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, startsWith("refresh_token=refresh-1")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/auth")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=604800")));
        }

        @Test
        void shouldReturnBadRequestWhenBodyIsInvalid() throws Exception {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"\",\"password\":\"\"}"))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(authService);
        }

        @Test
        void shouldReturnUnauthorizedWithoutCookieWhenCredentialsAreInvalid() throws Exception {
            when(authService.login(any())).thenThrow(new UnauthorizedException(MessageKeys.AUTH_INVALID_CREDENTIALS));

            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value(MessageKeys.AUTH_INVALID_CREDENTIALS))
                    .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        }
    }

    @Nested
    class Refresh {
        @Test
        void shouldReturnNewAccessTokenAndRotatedCookieWhenCookieIsPresent() throws Exception {
            when(authService.refresh("old-refresh")).thenReturn(session("access-2", "new-refresh"));

            mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "old-refresh")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value("access-2"))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, startsWith("refresh_token=new-refresh")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/auth")));
        }

        @Test
        void shouldNotRequireBearerToken() throws Exception {
            when(authService.refresh("old-refresh")).thenReturn(session("access-2", "new-refresh"));

            mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "old-refresh")))
                    .andExpect(status().isOk());
        }

        @Test
        void shouldReturnUnauthorizedWithCodeAndClearCookieWhenServiceRejects() throws Exception {
            when(authService.refresh("bad")).thenThrow(new UnauthorizedException(MessageKeys.AUTH_REFRESH_INVALID));

            mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "bad")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value(MessageKeys.AUTH_REFRESH_INVALID))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, startsWith("refresh_token=;")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/auth")));
        }

        @Test
        void shouldPassNullToServiceAndClearCookieWhenCookieIsMissing() throws Exception {
            when(authService.refresh(null)).thenThrow(new UnauthorizedException(MessageKeys.AUTH_REFRESH_INVALID));

            mvc.perform(post("/api/auth/refresh"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value(MessageKeys.AUTH_REFRESH_INVALID))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
        }
    }

    @Nested
    class Logout {
        @Test
        void shouldRevokeSessionAndClearCookieWithNoContent() throws Exception {
            mvc.perform(post("/api/auth/logout").cookie(new Cookie("refresh_token", "old-refresh")))
                    .andExpect(status().isNoContent())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, startsWith("refresh_token=;")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

            verify(authService).logout("old-refresh");
        }

        @Test
        void shouldBeIdempotentWhenCookieIsMissing() throws Exception {
            mvc.perform(post("/api/auth/logout"))
                    .andExpect(status().isNoContent())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

            verify(authService).logout(null);
        }
    }

    @Nested
    class StaleAccessToken {
        @Test
        void shouldReturnTokenStaleMessageWhenCheckerReportsStale() throws Exception {
            when(activeUserChecker.check(any(), any())).thenReturn(TokenStatus.STALE);

            mvc.perform(as(ADMIN_TOKEN, get("/api/auth/me")).header(HttpHeaders.ACCEPT_LANGUAGE, "en"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(containsString("out of date")));
        }

        @Test
        void shouldReturnGenericAuthenticationRequiredWhenCheckerReportsInvalid() throws Exception {
            when(activeUserChecker.check(any(), any())).thenReturn(TokenStatus.INVALID);

            mvc.perform(as(ADMIN_TOKEN, get("/api/auth/me")).header(HttpHeaders.ACCEPT_LANGUAGE, "en"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(not(containsString("out of date"))))
                    .andExpect(jsonPath("$.message").value(containsString("Authentication is required")));
        }

        @Test
        void shouldReturnGenericAuthenticationRequiredWithoutToken() throws Exception {
            mvc.perform(get("/api/auth/me").header(HttpHeaders.ACCEPT_LANGUAGE, "en"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(containsString("Authentication is required")));
        }
    }
}
