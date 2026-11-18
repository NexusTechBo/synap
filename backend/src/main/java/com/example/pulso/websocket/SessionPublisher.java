package com.example.pulso.websocket;

import com.example.pulso.websocket.event.SessionRefreshEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionRefresh(SessionRefreshEvent event) {
        var topic = SessionRefreshEvent.topic(event.clinicId());
        try {
            messagingTemplate.convertAndSend(topic, event.payload());
        } catch (RuntimeException e) {
            log.error("Session refresh event could not be published to {} of clinic {}", topic, event.clinicId(), e);
        }
    }
}
