package com.example.pulso.dto.whatsapp;

import com.example.pulso.exchange.contract.whatsapp.SessionStatus;

public record WhatsappStatusResponse(
        String id,
        SessionStatus status,
        String clinicPhoneNumber
) {}
