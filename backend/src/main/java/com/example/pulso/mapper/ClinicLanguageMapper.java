package com.example.pulso.mapper;

import com.example.pulso.enums.ClinicLanguage;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClinicLanguageMapper {
    default String languageToCode(ClinicLanguage language) {
        return language == null ? null : language.code();
    }
}
