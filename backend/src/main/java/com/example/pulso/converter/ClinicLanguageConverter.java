package com.example.pulso.converter;

import com.example.pulso.enums.ClinicLanguage;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ClinicLanguageConverter implements AttributeConverter<ClinicLanguage, String> {
    @Override
    public String convertToDatabaseColumn(ClinicLanguage attribute) {
        return attribute == null ? null : attribute.code();
    }

    @Override
    public ClinicLanguage convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ClinicLanguage.fromCode(dbData)
                .orElseThrow(() -> new IllegalStateException("Unknown clinic language in database: " + dbData));
    }
}
