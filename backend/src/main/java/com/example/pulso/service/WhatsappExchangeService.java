package com.example.pulso.service;

import com.example.pulso.dto.whatsapp.WhatsappStatusResponse;
import java.util.Optional;

public interface WhatsappExchangeService {
    Optional<byte[]> getSessionQr();

    WhatsappStatusResponse getSessionStatus();

    void logoutSession();

    void sendMessage(String sessionId, String to, String message, String ref);
}
