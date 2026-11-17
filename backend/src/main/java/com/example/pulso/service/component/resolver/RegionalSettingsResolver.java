package com.example.pulso.service.component.resolver;

import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import org.springframework.stereotype.Component;

@Component
public class RegionalSettingsResolver {
    public record RegionalSettings(SupportedCountry country, String timezone, ClinicLanguage language) {}

    public RegionalSettings resolveWithDefaults(String country, String timezone, String language) {
        var resolvedCountry = isBlank(country) ? SupportedCountry.BO : parseCountry(country);
        var resolvedTimezone = isBlank(timezone) ? resolvedCountry.defaultTimezone() : timezone.strip();
        var resolvedLanguage = isBlank(language) ? resolvedCountry.defaultLanguage() : parseLanguage(language);
        return validated(resolvedCountry, resolvedTimezone, resolvedLanguage);
    }

    public RegionalSettings resolveStrict(String country, String timezone, String language) {
        return validated(parseCountry(country), timezone == null ? null : timezone.strip(), parseLanguage(language));
    }

    private static RegionalSettings validated(SupportedCountry country, String timezone, ClinicLanguage language) {
        if (timezone == null || !country.supportsTimezone(timezone))
            throw new BadRequestException(MessageKeys.REGION_TIMEZONE_INVALID, timezone, country.name());
        return new RegionalSettings(country, timezone, language);
    }

    private static SupportedCountry parseCountry(String code) {
        return SupportedCountry.fromCode(code)
                .orElseThrow(() -> new BadRequestException(MessageKeys.REGION_COUNTRY_UNSUPPORTED, code));
    }

    private static ClinicLanguage parseLanguage(String code) {
        return ClinicLanguage.fromCode(code)
                .orElseThrow(() -> new BadRequestException(MessageKeys.REGION_LANGUAGE_UNSUPPORTED, code));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
