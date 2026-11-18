package com.example.pulso.websocket.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.example.pulso.websocket.StompConnectionRegistry;
import com.example.pulso.websocket.StompSessionCloser;
import com.example.pulso.websocket.event.UserSessionsRevokedEvent;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@ExtendWith(MockitoExtension.class)
class UserSessionsRevocationListenerTest {
    private static final Long CLINIC = 1L;
    private static final Long USER = 10L;

    @Mock
    private StompSessionCloser closer;

    private final StompConnectionRegistry registry = new StompConnectionRegistry();

    private UserSessionsRevocationListener listener() {
        return new UserSessionsRevocationListener(registry, closer);
    }

    @Test
    void shouldCloseAllSessionsOfUserWhenNoSessionIsKept() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.register(CLINIC, USER, "s2", UUID.randomUUID());

        listener().onUserSessionsRevoked(new UserSessionsRevokedEvent(CLINIC, USER, null));

        verify(closer).close("s1");
        verify(closer).close("s2");
    }

    @Test
    void shouldKeepSessionsOfKeptFamily() {
        var keep = UUID.randomUUID();
        registry.register(CLINIC, USER, "kept", keep);
        registry.register(CLINIC, USER, "other", UUID.randomUUID());

        listener().onUserSessionsRevoked(new UserSessionsRevokedEvent(CLINIC, USER, keep));

        verify(closer).close("other");
        verify(closer, never()).close("kept");
    }

    @Test
    void shouldNotCloseSessionsOfOtherUsersOrClinics() {
        registry.register(CLINIC, USER, "mine", UUID.randomUUID());
        registry.register(CLINIC, 11L, "otherUser", UUID.randomUUID());
        registry.register(2L, USER, "otherClinic", UUID.randomUUID());

        listener().onUserSessionsRevoked(new UserSessionsRevokedEvent(CLINIC, USER, null));

        verify(closer).close("mine");
        verify(closer, never()).close("otherUser");
        verify(closer, never()).close("otherClinic");
    }

    @Test
    void shouldDoNothingWhenUserHasNoConnections() {
        listener().onUserSessionsRevoked(new UserSessionsRevokedEvent(CLINIC, USER, null));

        verifyNoInteractions(closer);
    }

    @Test
    void shouldListenOnlyAfterCommit() throws NoSuchMethodException {
        var method = UserSessionsRevocationListener.class.getMethod("onUserSessionsRevoked", UserSessionsRevokedEvent.class);

        var annotation = method.getAnnotation(TransactionalEventListener.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.phase()).isEqualTo(TransactionPhase.AFTER_COMMIT);
    }
}
