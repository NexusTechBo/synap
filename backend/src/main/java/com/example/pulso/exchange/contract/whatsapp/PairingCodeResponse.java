package com.example.pulso.exchange.contract.whatsapp;

public record PairingCodeResponse(
        String id,
        SessionStatus status,
        String code
) {}
