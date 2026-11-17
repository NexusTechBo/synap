package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.dto.region.CountryResponse;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class RegionServiceImplTest {
    private final RegionServiceImpl service = new RegionServiceImpl();

    private CountryResponse country(String code) {
        return service.getCatalog().countries().stream()
                .filter(c -> c.code().equals(code))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void shouldExposeBoliviaAndBrazil() {
        assertThat(service.getCatalog().countries()).extracting(CountryResponse::code).containsExactly("BO", "BR");
    }

    @Test
    void shouldDescribeBolivia() {
        var bo = country("BO");

        assertThat(bo.defaultTimezone()).isEqualTo("America/La_Paz");
        assertThat(bo.timezones()).containsExactly("America/La_Paz");
        assertThat(bo.defaultLanguage()).isEqualTo("es");
    }

    @Test
    void shouldDescribeBrazil() {
        var br = country("BR");

        assertThat(br.defaultTimezone()).isEqualTo("America/Sao_Paulo");
        assertThat(br.timezones()).hasSize(16).contains("America/Sao_Paulo", "America/Manaus");
        assertThat(br.defaultLanguage()).isEqualTo("pt-BR");
    }

    @Test
    void shouldOnlyExposeValidTimezonesIncludingDefault() {
        for (var c : service.getCatalog().countries()) {
            assertThat(c.timezones()).contains(c.defaultTimezone()).doesNotHaveDuplicates();
            c.timezones().forEach(tz -> assertThat(ZoneId.of(tz)).isNotNull());
        }
    }

    @Test
    void shouldExposeLanguages() {
        assertThat(service.getCatalog().languages()).containsExactly("es", "en", "pt-BR");
    }
}
