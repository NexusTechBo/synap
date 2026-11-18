package com.example.pulso.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class StompSessionCloser {
    static final String INVALID_TOKEN = "Invalid token";

    private final MessageChannel clientOutboundChannel;

    public StompSessionCloser(@Qualifier("clientOutboundChannel") MessageChannel clientOutboundChannel) {
        this.clientOutboundChannel = clientOutboundChannel;
    }

    public void close(String stompSessionId) {
        try {
            var accessor = StompHeaderAccessor.create(StompCommand.ERROR);
            accessor.setSessionId(stompSessionId);
            accessor.setMessage(INVALID_TOKEN);
            accessor.setLeaveMutable(true);
            clientOutboundChannel.send(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()));
        } catch (RuntimeException e) {
            log.error("STOMP session {} could not be closed", stompSessionId, e);
        }
    }
}
