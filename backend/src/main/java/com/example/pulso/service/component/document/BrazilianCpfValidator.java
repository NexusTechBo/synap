package com.example.pulso.service.component.document;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.util.Utils;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class BrazilianCpfValidator implements DocumentValidator {
    private static final int LENGTH = 11;
    private static final int MODULUS = 11;
    private static final Pattern DIGITS = Pattern.compile("\\d{" + LENGTH + "}");
    private static final Pattern REPEATED_DIGIT = Pattern.compile("(\\d)\\1{" + (LENGTH - 1) + "}");

    @Override
    public SupportedCountry country() {
        return SupportedCountry.BR;
    }

    @Override
    public String validateAndNormalize(String raw) {
        var document = Utils.stripDocumentSeparators(raw);
        if (!isValid(document)) throw new BadRequestException(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        return document;
    }

    private static boolean isValid(String document) {
        return DIGITS.matcher(document).matches()
                && !REPEATED_DIGIT.matcher(document).matches()
                && checkDigit(document, 9) == digit(document, 9)
                && checkDigit(document, 10) == digit(document, 10);
    }

    private static int checkDigit(String document, int length) {
        var sum = 0;
        for (var i = 0; i < length; i++) sum += digit(document, i) * (length + 1 - i);
        var remainder = (sum * 10) % MODULUS;
        return remainder == 10 ? 0 : remainder;
    }

    private static int digit(String document, int index) {
        return document.charAt(index) - '0';
    }
}
