package com.example.pulso.websocket;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.example.pulso.websocket.event.SessionRefreshEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class SessionPublisherTest {
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private SessionPublisher publisher;

    @Test
    void shouldPublishSessionRefreshToClinicSessionTopic() {
        publisher.onSessionRefresh(new SessionRefreshEvent(7L));

        verify(messagingTemplate).convertAndSend("/topic/clinic/7/session", new SessionRefreshEvent.SessionPayload("SESSION_REFRESH"));
    }

    @Test
    void shouldContainErrorsWhenPublishingFails() {
        doThrow(new MessagingException("broker down"))
                .when(messagingTemplate)
                .convertAndSend("/topic/clinic/7/session", new SessionRefreshEvent.SessionPayload("SESSION_REFRESH"));

        assertThatCode(() -> publisher.onSessionRefresh(new SessionRefreshEvent(7L))).doesNotThrowAnyException();
    }
}
