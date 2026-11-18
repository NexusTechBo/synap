package com.example.pulso.websocket.event;

import java.util.Objects;

public record SessionRefreshEvent(Long clinicId) {
    private static final String CLINIC_PREFIX = "/topic/clinic/";
    private static final String SESSION_SUFFIX = "/session";

    public SessionRefreshEvent {
        Objects.requireNonNull(clinicId, "clinicId");
    }

    public static String topic(Long clinicId) {
        return CLINIC_PREFIX + clinicId + SESSION_SUFFIX;
    }

    public SessionPayload payload() {
        return SessionPayload.refresh();
    }

    public record SessionPayload(String type) {
        private static final String SESSION_REFRESH = "SESSION_REFRESH";

        public static SessionPayload refresh() {
            return new SessionPayload(SESSION_REFRESH);
        }
    }
}
