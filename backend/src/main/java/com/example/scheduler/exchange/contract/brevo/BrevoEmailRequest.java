package com.example.scheduler.exchange.contract.brevo;

import java.util.List;

public record BrevoEmailRequest(
        BrevoContact sender,
        List<BrevoContact> to,
        String subject,
        String htmlContent
) {}
