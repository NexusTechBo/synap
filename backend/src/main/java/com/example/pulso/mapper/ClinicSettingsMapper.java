package com.example.pulso.mapper;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClinicSettingsMapper {
    ClinicRegionalSettingsResponse toRegionalSettingsResponse(Clinic clinic);

    default String languageToCode(ClinicLanguage language) {
        return language == null ? null : language.code();
    }
}
