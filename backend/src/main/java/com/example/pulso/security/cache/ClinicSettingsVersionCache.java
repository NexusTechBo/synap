package com.example.pulso.security.cache;

import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.websocket.event.SessionRefreshEvent;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ClinicSettingsVersionCache {
    private static final Duration TTL = Duration.ofSeconds(30);
    private static final long MAX_SIZE = 10_000;

    private final ClinicRepository clinicRepository;
    private final Cache<Long, Integer> versions = Caffeine.newBuilder()
            .expireAfterWrite(TTL)
            .maximumSize(MAX_SIZE)
            .build();

    public Optional<Integer> get(Long clinicId) {
        var cached = versions.getIfPresent(clinicId);
        if (cached != null) return Optional.of(cached);
        var loaded = clinicRepository.findSettingsVersionById(clinicId);
        loaded.ifPresent(version -> versions.put(clinicId, version));
        return loaded;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionRefresh(SessionRefreshEvent event) {
        versions.invalidate(event.clinicId());
    }
}
