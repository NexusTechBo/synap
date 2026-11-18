package com.example.pulso.websocket.event;

import java.util.Objects;
import java.util.UUID;

public record UserSessionsRevokedEvent(Long clinicId, Long userId, UUID keepSessionId) {
    public UserSessionsRevokedEvent {
        Objects.requireNonNull(clinicId, "clinicId");
        Objects.requireNonNull(userId, "userId");
    }
}
