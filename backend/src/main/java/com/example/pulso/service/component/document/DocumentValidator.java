package com.example.pulso.service.component.document;

import com.example.pulso.enums.SupportedCountry;

public interface DocumentValidator {
    SupportedCountry country();

    String validateAndNormalize(String raw);
}
