package com.example.pulso.websocket;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class StompConnectionRegistry {
    private record UserKey(Long clinicId, Long userId) {}

    private final Map<UserKey, Map<String, UUID>> connections = new ConcurrentHashMap<>();

    public void register(Long clinicId, Long userId, String stompSessionId, UUID sessionId) {
        Objects.requireNonNull(sessionId, "sessionId");
        connections.compute(new UserKey(clinicId, userId), (_, current) -> {
            var updated = current == null ? new HashMap<String, UUID>() : new HashMap<>(current);
            updated.put(stompSessionId, sessionId);
            return Map.copyOf(updated);
        });
    }

    public void unregister(Long clinicId, Long userId, String stompSessionId) {
        connections.computeIfPresent(new UserKey(clinicId, userId), (_, current) -> {
            var updated = new HashMap<>(current);
            updated.remove(stompSessionId);
            return updated.isEmpty() ? null : Map.copyOf(updated);
        });
    }

    public List<String> stompSessionsOfExcept(Long clinicId, Long userId, UUID keepSessionId) {
        return connections.getOrDefault(new UserKey(clinicId, userId), Map.of()).entrySet().stream()
                .filter(entry -> keepSessionId == null || !keepSessionId.equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .toList();
    }
}
