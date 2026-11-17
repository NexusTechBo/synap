package com.example.pulso.mapper;

import com.example.pulso.dto.clinic.ClinicRegionalSettingsResponse;
import com.example.pulso.entity.Clinic;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = ClinicLanguageMapper.class)
public interface ClinicSettingsMapper {
    ClinicRegionalSettingsResponse toRegionalSettingsResponse(Clinic clinic);
}
