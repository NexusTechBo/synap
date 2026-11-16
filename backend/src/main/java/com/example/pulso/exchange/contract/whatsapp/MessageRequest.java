package com.example.pulso.exchange.contract.whatsapp;

public record MessageRequest(
        String session,
        String to,
        String message
) {}
