package com.example.pulso.service.component.document;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class BolivianCiValidator implements DocumentValidator {
    private static final Pattern CI = Pattern.compile("\\d{5,10}");

    @Override
    public SupportedCountry country() {
        return SupportedCountry.BO;
    }

    @Override
    public String validateAndNormalize(String raw) {
        var document = raw.strip();
        if (!CI.matcher(document).matches()) throw new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CI_INVALID);
        return document;
    }
}
