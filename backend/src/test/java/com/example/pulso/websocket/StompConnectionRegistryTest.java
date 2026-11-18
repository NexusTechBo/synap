package com.example.pulso.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class StompConnectionRegistryTest {
    private static final Long CLINIC = 1L;
    private static final Long USER = 10L;

    private final StompConnectionRegistry registry = new StompConnectionRegistry();

    @Test
    void shouldReturnRegisteredSession() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s1");
    }

    @Test
    void shouldReturnEmptyWhenUserHasNoConnections() {
        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
    }

    @Test
    void shouldReturnAllSessionsOfSameUser() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.register(CLINIC, USER, "s2", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactlyInAnyOrder("s1", "s2");
    }

    @Test
    void shouldExcludeSessionsOfKeptFamily() {
        var keep = UUID.randomUUID();
        registry.register(CLINIC, USER, "s1", keep);
        registry.register(CLINIC, USER, "s2", keep);
        registry.register(CLINIC, USER, "s3", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, keep)).containsExactly("s3");
    }

    @Test
    void shouldReturnAllSessionsWhenKeptFamilyDoesNotMatch() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, UUID.randomUUID())).containsExactly("s1");
    }

    @Test
    void shouldRejectRegistrationWithNullSessionId() {
        assertThatThrownBy(() -> registry.register(CLINIC, USER, "s1", null)).isInstanceOf(NullPointerException.class);

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
    }

    @Test
    void shouldIsolateUsers() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.register(CLINIC, 11L, "s2", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s1");
        assertThat(registry.stompSessionsOfExcept(CLINIC, 11L, null)).containsExactly("s2");
    }

    @Test
    void shouldIsolateClinicsForSameUserId() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.register(2L, USER, "s2", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s1");
        assertThat(registry.stompSessionsOfExcept(2L, USER, null)).containsExactly("s2");
    }

    @Test
    void shouldRemoveOnlyUnregisteredSession() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.register(CLINIC, USER, "s2", UUID.randomUUID());

        registry.unregister(CLINIC, USER, "s1");

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s2");
    }

    @Test
    void shouldReturnEmptyAfterLastSessionIsUnregistered() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());

        registry.unregister(CLINIC, USER, "s1");

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).isEmpty();
    }

    @Test
    void shouldIgnoreUnregisterOfUnknownSession() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());

        registry.unregister(CLINIC, USER, "unknown");
        registry.unregister(CLINIC, 99L, "s1");

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s1");
    }

    @Test
    void shouldAllowRegisteringAgainAfterKeyWasCleaned() {
        registry.register(CLINIC, USER, "s1", UUID.randomUUID());
        registry.unregister(CLINIC, USER, "s1");

        registry.register(CLINIC, USER, "s2", UUID.randomUUID());

        assertThat(registry.stompSessionsOfExcept(CLINIC, USER, null)).containsExactly("s2");
    }
}
