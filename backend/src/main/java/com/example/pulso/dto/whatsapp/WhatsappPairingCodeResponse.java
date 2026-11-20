package com.example.pulso.dto.whatsapp;

import com.example.pulso.exchange.contract.whatsapp.SessionStatus;

public record WhatsappPairingCodeResponse(
        SessionStatus status,
        String code
) {}
