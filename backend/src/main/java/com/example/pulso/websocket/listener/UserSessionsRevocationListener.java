package com.example.pulso.websocket.listener;

import com.example.pulso.websocket.StompConnectionRegistry;
import com.example.pulso.websocket.StompSessionCloser;
import com.example.pulso.websocket.event.UserSessionsRevokedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserSessionsRevocationListener {
    private final StompConnectionRegistry registry;
    private final StompSessionCloser sessionCloser;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserSessionsRevoked(UserSessionsRevokedEvent event) {
        var stompSessions = registry.stompSessionsOfExcept(event.clinicId(), event.userId(), event.keepSessionId());
        if (stompSessions.isEmpty()) return;
        stompSessions.forEach(sessionCloser::close);
        log.info(
                "STOMP sessions of user {} in clinic {} closed after revocation: {}",
                event.userId(),
                event.clinicId(),
                stompSessions.size()
        );
    }
}
