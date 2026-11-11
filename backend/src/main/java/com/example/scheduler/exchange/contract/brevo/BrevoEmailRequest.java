package com.example.scheduler.exchange.contract.brevo;

import com.example.scheduler.util.LogUtils;
import org.jspecify.annotations.NonNull;

import java.util.List;

public record BrevoEmailRequest(
        BrevoContact sender,
        List<BrevoContact> to,
        String subject,
        String htmlContent
) {
    @Override
    public @NonNull String toString() {
        var recipients = to == null
                ? List.<String>of()
                : to.stream().map(BrevoEmailRequest::maskedEmail).toList();
        return "BrevoEmailRequest[sender=%s, to=%s, subject=%s, htmlContent=<%d chars>]".formatted(
                sender == null ? null : sender.email(),
                recipients,
                LogUtils.sanitizeForLog(subject),
                htmlContent == null ? 0 : htmlContent.length()
        );
    }

    private static String maskedEmail(BrevoContact contact) {
        return contact == null || contact.email() == null ? null : LogUtils.maskEmail(contact.email());
    }
}
