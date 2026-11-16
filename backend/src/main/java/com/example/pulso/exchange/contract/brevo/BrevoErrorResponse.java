package com.example.pulso.exchange.contract.brevo;

public record BrevoErrorResponse(
        String code,
        String message
) {}
