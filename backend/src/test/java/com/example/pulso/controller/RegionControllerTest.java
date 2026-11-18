package com.example.pulso.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.pulso.config.JacksonConfig;
import com.example.pulso.config.LocaleConfig;
import com.example.pulso.config.SecurityConfig;
import com.example.pulso.config.ratelimiting.RateLimitProperties;
import com.example.pulso.dto.region.CountryResponse;
import com.example.pulso.dto.region.RegionCatalogResponse;
import com.example.pulso.exception.ErrorResponseWriter;
import com.example.pulso.security.ActiveUserChecker;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.service.RegionService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = RegionController.class, properties = "rate-limit.enabled=false")
@Import({
    SecurityConfig.class,
    LocaleConfig.class,
    JacksonConfig.class,
    ErrorResponseWriter.class,
    RegionControllerTest.SliceSecurityConfig.class
})
class RegionControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private RegionService regionService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private ActiveUserChecker activeUserChecker;

    @TestConfiguration
    @EnableConfigurationProperties(RateLimitProperties.class)
    static class SliceSecurityConfig {}

    @Test
    void shouldReturnCatalogWithoutToken() throws Exception {
        when(regionService.getCatalog())
                .thenReturn(new RegionCatalogResponse(
                        List.of(new CountryResponse(
                                "BO", "America/La_Paz", List.of("America/La_Paz"), "es", "+591 700 00000")),
                        List.of("es", "en", "pt-BR")));

        mvc.perform(get("/api/regions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countries[0].code").value("BO"))
                .andExpect(jsonPath("$.countries[0].defaultTimezone").value("America/La_Paz"))
                .andExpect(jsonPath("$.languages[2]").value("pt-BR"));
    }
}
