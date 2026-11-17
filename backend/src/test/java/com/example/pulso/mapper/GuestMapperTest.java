package com.example.pulso.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("GuestMapper")
class GuestMapperTest {

    private final GuestMapper mapper = new GuestMapperImpl(new ClinicSettingsMapperImpl());

    @Test
    @DisplayName("toClinicResponse maps fields and serializes language as code")
    void toClinicResponse() {
        var clinic = Clinic.builder()
                .name("Demo")
                .slug("demo")
                .country(SupportedCountry.BR)
                .timezone("America/Manaus")
                .defaultLanguage(ClinicLanguage.PT_BR)
                .build();

        var response = mapper.toClinicResponse(clinic);

        assertThat(response.name()).isEqualTo("Demo");
        assertThat(response.slug()).isEqualTo("demo");
        assertThat(response.country()).isEqualTo("BR");
        assertThat(response.timezone()).isEqualTo("America/Manaus");
        assertThat(response.defaultLanguage()).isEqualTo("pt-BR");
    }
}
