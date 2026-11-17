package com.example.pulso.service.component.resolver;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.service.component.document.DocumentValidator;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class IdentityDocumentResolver {
    private final Map<SupportedCountry, DocumentValidator> validators = new EnumMap<>(SupportedCountry.class);

    public IdentityDocumentResolver(List<DocumentValidator> documentValidators) {
        for (var validator : documentValidators) {
            if (validators.put(validator.country(), validator) != null)
                throw new IllegalStateException("Duplicate document validator for country " + validator.country());
        }
        var missing = Arrays.stream(SupportedCountry.values())
                .filter(country -> !validators.containsKey(country))
                .toList();
        if (!missing.isEmpty())
            throw new IllegalStateException("No document validator registered for countries " + missing);
    }

    public String validateAndNormalize(String raw, SupportedCountry country) {
        if (!StringUtils.hasText(raw)) return null;
        return validators.get(country).validateAndNormalize(raw);
    }

    public String validateAndNormalizeUnlessUnchanged(String raw, SupportedCountry country, String storedDocument) {
        if (StringUtils.hasText(raw) && raw.strip().equals(storedDocument)) return storedDocument;
        return validateAndNormalize(raw, country);
    }
}
