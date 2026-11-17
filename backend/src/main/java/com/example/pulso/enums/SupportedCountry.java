package com.example.pulso.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public enum SupportedCountry {
    BO("America/La_Paz",
            List.of("America/La_Paz"),
            ClinicLanguage.ES,
            "+591 700 00000"),
    BR("America/Sao_Paulo",
            List.of("America/Noronha",
                    "America/Belem",
                    "America/Fortaleza",
                    "America/Recife",
                    "America/Araguaina",
                    "America/Maceio",
                    "America/Bahia",
                    "America/Sao_Paulo",
                    "America/Campo_Grande",
                    "America/Cuiaba",
                    "America/Santarem",
                    "America/Porto_Velho",
                    "America/Boa_Vista",
                    "America/Manaus",
                    "America/Eirunepe",
                    "America/Rio_Branco"),
            ClinicLanguage.PT_BR,
            "+55 11 91234 5678");

    private final String defaultTimezone;
    private final List<String> timezones;
    private final ClinicLanguage defaultLanguage;
    private final String phonePlaceholder;

    SupportedCountry(String defaultTimezone,
                     List<String> timezones,
                     ClinicLanguage defaultLanguage,
                     String phonePlaceholder) {
        this.defaultTimezone = defaultTimezone;
        this.timezones = List.copyOf(timezones);
        this.defaultLanguage = defaultLanguage;
        this.phonePlaceholder = phonePlaceholder;
    }

    public String defaultTimezone() {
        return defaultTimezone;
    }

    public List<String> timezones() {
        return timezones;
    }

    public ClinicLanguage defaultLanguage() {
        return defaultLanguage;
    }

    public String phonePlaceholder() {
        return phonePlaceholder;
    }

    public boolean supportsTimezone(String timezone) {
        return timezones.contains(timezone);
    }

    public static Optional<SupportedCountry> fromCode(String code) {
        if (code == null) return Optional.empty();
        var normalized = code.strip().toUpperCase(Locale.ROOT);
        return Arrays.stream(values()).filter(c -> c.name().equals(normalized)).findFirst();
    }
}
