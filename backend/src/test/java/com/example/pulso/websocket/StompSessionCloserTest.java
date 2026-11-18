package com.example.pulso.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

@ExtendWith(MockitoExtension.class)
class StompSessionCloserTest {
    @Mock
    private MessageChannel outboundChannel;

    @Captor
    private ArgumentCaptor<Message<?>> messageCaptor;

    @Test
    void shouldSendErrorFrameWithInvalidTokenMessageToSession() {
        var closer = new StompSessionCloser(outboundChannel);

        closer.close("session-1");

        verify(outboundChannel).send(messageCaptor.capture());
        var accessor = StompHeaderAccessor.wrap(messageCaptor.getValue());
        assertThat(accessor.getCommand()).isEqualTo(StompCommand.ERROR);
        assertThat(accessor.getMessage()).isEqualTo("Invalid token");
        assertThat(accessor.getSessionId()).isEqualTo("session-1");
    }

    @Test
    void shouldNotPropagateChannelFailure() {
        when(outboundChannel.send(any())).thenThrow(new IllegalStateException("channel down"));
        var closer = new StompSessionCloser(outboundChannel);

        assertThatCode(() -> closer.close("session-1")).doesNotThrowAnyException();
    }
}
