package com.example.pulso.notification;

import com.example.pulso.util.LogUtils;
import org.jspecify.annotations.NonNull;

public record OutgoingEmail(
        String to,
        String subject,
        String html
) {
    @Override
    public @NonNull String toString() {
        return "OutgoingEmail[to=%s, subject=%s, html=<%d chars>]".formatted(
                to == null ? null : LogUtils.maskEmail(to),
                LogUtils.sanitizeForLog(subject),
                html == null ? 0 : html.length()
        );
    }
}
