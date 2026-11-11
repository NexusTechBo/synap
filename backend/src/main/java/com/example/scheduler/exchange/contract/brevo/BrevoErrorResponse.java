package com.example.scheduler.exchange.contract.brevo;

public record BrevoErrorResponse(
        String code,
        String message
) {}
