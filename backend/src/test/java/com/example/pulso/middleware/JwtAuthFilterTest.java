package com.example.pulso.middleware;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.ERole;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.RoleProfile;
import com.example.pulso.security.jwt.JwtClaims;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.util.LogKeys;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {
    private static final String TOKEN = "token";

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private ActiveUserChecker activeUserChecker;

    private final List<String> authoritiesSeenInChain = new ArrayList<>();
    private final List<String> mdcRoleSeenInChain = new ArrayList<>();
    private final List<String> mdcUserSeenInChain = new ArrayList<>();

    private final FilterChain chain = (_, _) -> {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).forEach(authoritiesSeenInChain::add);
        }
        mdcRoleSeenInChain.add(MDC.get(LogKeys.ROLE));
        mdcUserSeenInChain.add(MDC.get(LogKeys.USER_ID));
    };

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
        MDC.clear();
    }

    private Claims claims(String subject, String claimName, Object claimValue) {
        var builder = Jwts.claims()
                .subject(subject)
                .add(JwtClaims.CLINIC_ID, 7L)
                .add(JwtClaims.CLINIC_SLUG, "demo")
                .add(JwtClaims.TIMEZONE, "America/La_Paz")
                .add(JwtClaims.COUNTRY, "BO");
        builder.add(claimName, claimValue);
        return builder.build();
    }

    private void run(Claims claims) throws Exception {
        when(jwtUtil.parse(TOKEN)).thenReturn(Optional.of(claims));
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + TOKEN);
        new JwtAuthFilter(jwtUtil, activeUserChecker).doFilter(request, new MockHttpServletResponse(), chain);
    }

    @Test
    void shouldNotAuthenticateNorQueryCheckerWhenRolesAreInvalid() throws Exception {
        run(claims("1", JwtClaims.ROLES, List.of("GUEST", "DOCTOR")));

        assertThat(authoritiesSeenInChain).isEmpty();
        assertThat(mdcRoleSeenInChain).containsExactly((String) null);
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldNotAuthenticateWhenRolesClaimIsEmpty() throws Exception {
        run(claims("1", JwtClaims.ROLES, List.of()));

        assertThat(authoritiesSeenInChain).isEmpty();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldNotAuthenticateWhenTokenOnlyHasLegacyRoleClaim() throws Exception {
        run(claims("1", "role", "ADMINISTRATOR"));

        assertThat(authoritiesSeenInChain).isEmpty();
        verifyNoInteractions(activeUserChecker);
    }

    @Test
    void shouldAuthenticateWithRoleAuthoritiesWhenStaffIsActive() throws Exception {
        when(activeUserChecker.isActive(2L, new RoleProfile(ERole.DOCTOR, false))).thenReturn(true);

        run(claims("2", JwtClaims.ROLES, List.of("DOCTOR")));

        assertThat(authoritiesSeenInChain).containsExactly("ROLE_DOCTOR");
        assertThat(mdcRoleSeenInChain).containsExactly("DOCTOR");
        assertThat(mdcUserSeenInChain).containsExactly("2");
    }

    @Test
    void shouldAuthenticateWithBothAuthoritiesWhenAdministratorIsAlsoDoctor() throws Exception {
        when(activeUserChecker.isActive(1L, new RoleProfile(ERole.ADMINISTRATOR, true))).thenReturn(true);

        run(claims("1", JwtClaims.ROLES, List.of("ADMINISTRATOR", "DOCTOR")));

        assertThat(authoritiesSeenInChain).containsExactlyInAnyOrder("ROLE_ADMINISTRATOR", "ROLE_DOCTOR");
        assertThat(mdcRoleSeenInChain).containsExactly("ADMINISTRATOR");
    }

    @Test
    void shouldNotAuthenticateWhenStaffIsInactive() throws Exception {
        when(activeUserChecker.isActive(2L, new RoleProfile(ERole.DOCTOR, false))).thenReturn(false);

        run(claims("2", JwtClaims.ROLES, List.of("DOCTOR")));

        assertThat(authoritiesSeenInChain).isEmpty();
        assertThat(mdcRoleSeenInChain).containsExactly((String) null);
    }

    @Test
    void shouldAuthenticateGuestWithGuestAuthorityAndGuestLogUser() throws Exception {
        when(activeUserChecker.isActive(0L, new RoleProfile(ERole.GUEST, false))).thenReturn(true);

        run(claims("0", JwtClaims.ROLES, List.of("GUEST")));

        assertThat(authoritiesSeenInChain).containsExactly("ROLE_GUEST");
        assertThat(mdcRoleSeenInChain).containsExactly("GUEST");
        assertThat(mdcUserSeenInChain).containsExactly(LogKeys.GUEST_USER);
        verify(activeUserChecker).isActive(0L, new RoleProfile(ERole.GUEST, false));
    }

    @Test
    void shouldClearMdcAndTenantAfterRequest() throws Exception {
        when(activeUserChecker.isActive(2L, new RoleProfile(ERole.DOCTOR, false))).thenReturn(true);

        run(claims("2", JwtClaims.ROLES, List.of("DOCTOR")));

        assertThat(MDC.get(LogKeys.ROLE)).isNull();
        assertThat(MDC.get(LogKeys.USER_ID)).isNull();
        assertThat(TenantContext.current()).isNull();
    }
}
