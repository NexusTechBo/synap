package com.example.pulso.util;

import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.MessageKeys;
import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

public final class Utils {
    public static final String USERNAME_DOMAIN = ".com";
    private static final Pattern CONTROL_CHARS = Pattern.compile("\\p{Cntrl}");
    private static final Pattern DOCUMENT_SEPARATORS = Pattern.compile("[.\\-\\s]");

    public static String normalizePhoneNumber(String phoneNumber, SupportedCountry region) {
        if (!StringUtils.hasText(phoneNumber)) return null;
        var phoneUtil = PhoneNumberUtil.getInstance();
        try {
            var parsed = phoneUtil.parse(phoneNumber, region.name());
            if (phoneUtil.isValidNumber(parsed))
                return phoneUtil.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException _) {}
        throw new BadRequestException(MessageKeys.VALIDATION_PHONE_INVALID);
    }

    public static String stripDocumentSeparators(String document) {
        return DOCUMENT_SEPARATORS.matcher(document).replaceAll("");
    }

    public static String stripLeadingPlus(String phoneNumber) {
        return phoneNumber != null ? phoneNumber.replaceFirst("^\\+", "") : null;
    }

    public static String addLeadingPlus(String digits) {
        return StringUtils.hasText(digits) ? "+" + digits : null;
    }

    public static String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.strip().toLowerCase(Locale.ROOT) : null;
    }

    public static String usernameSuffix(String clinicSlug) {
        return "@" + clinicSlug + USERNAME_DOMAIN;
    }

    public static String stripControlChars(String value) {
        return CONTROL_CHARS.matcher(value).replaceAll("");
    }

    public static String escapeHtml(String value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
    }
}
