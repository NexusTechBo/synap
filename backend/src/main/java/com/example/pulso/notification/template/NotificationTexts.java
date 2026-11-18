package com.example.pulso.notification.template;

import com.example.pulso.enums.ERole;
import com.example.pulso.util.DateTimeUtils;
import com.example.pulso.util.Utils;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class NotificationTexts {
    private static final String CLINIC_FALLBACK = "notification.clinicFallback";
    private static final String DATE_PATTERN = "notification.datePattern";
    private static final String ROLE_PREFIX = "notification.role.";
    private static final String LABEL_PREFIX = "notification.label.";

    private final MessageSource messageSource;

    String get(Locale locale, String key, Object... args) {
        return messageSource.getMessage(key, args, locale);
    }

    String label(Locale locale, String name) {
        return get(locale, LABEL_PREFIX + name);
    }

    String formatDate(LocalDateTime dateTime, Locale locale) {
        return dateTime.format(DateTimeFormatter.ofPattern(get(locale, DATE_PATTERN), locale));
    }

    String formatTimeRange(LocalDateTime start, LocalDateTime end) {
        var from = start.format(DateTimeUtils.TIME);
        return end != null ? from + " - " + end.format(DateTimeUtils.TIME) : from;
    }

    String clinicLabel(String clinicName, Locale locale) {
        var name = clinicName == null ? null : Utils.stripControlChars(clinicName).strip();
        return StringUtils.hasText(name) ? name : get(locale, CLINIC_FALLBACK);
    }

    String whatsappClinicLabel(String clinicName, Locale locale) {
        return StringUtils.hasText(clinicName) ? clinicName.strip() : get(locale, CLINIC_FALLBACK);
    }

    String roleLabel(ERole role, Locale locale) {
        return role == null ? "" : get(locale, ROLE_PREFIX + role.name());
    }
}
