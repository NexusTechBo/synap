package com.example.pulso.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ClinicSettingsMapper")
class ClinicSettingsMapperTest {

    private final ClinicSettingsMapper mapper = new ClinicSettingsMapperImpl(new ClinicLanguageMapperImpl());

    @Test
    @DisplayName("maps Bolivian clinic with Spanish")
    void mapsBolivia() {
        var clinic = Clinic.builder()
                .country(SupportedCountry.BO)
                .timezone("America/La_Paz")
                .defaultLanguage(ClinicLanguage.ES)
                .build();

        var response = mapper.toRegionalSettingsResponse(clinic);

        assertThat(response.country()).isEqualTo("BO");
        assertThat(response.timezone()).isEqualTo("America/La_Paz");
        assertThat(response.defaultLanguage()).isEqualTo("es");
    }

    @Test
    @DisplayName("maps Brazilian clinic with pt-BR code, not enum name")
    void mapsBrazil() {
        var clinic = Clinic.builder()
                .country(SupportedCountry.BR)
                .timezone("America/Manaus")
                .defaultLanguage(ClinicLanguage.PT_BR)
                .build();

        var response = mapper.toRegionalSettingsResponse(clinic);

        assertThat(response.country()).isEqualTo("BR");
        assertThat(response.timezone()).isEqualTo("America/Manaus");
        assertThat(response.defaultLanguage()).isEqualTo("pt-BR");
    }
}
