package com.example.pulso.notification.listener;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.example.pulso.exception.ServiceUnavailableException;
import com.example.pulso.notification.event.AdminPhoneChangedEvent;
import com.example.pulso.service.WhatsappExchangeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminPhoneChangedListenerTest {

    @Mock
    private WhatsappExchangeService whatsappExchangeService;

    @InjectMocks
    private com.example.pulso.notification.listener.AdminPhoneChangedListener listener;

    @Test
    void shouldLogoutWhatsappSessionWhenEventIsHandled() {
        var event = new AdminPhoneChangedEvent(1L, "+59170000001", "+59171234567");

        listener.onAdminPhoneChanged(event);

        verify(whatsappExchangeService).logoutSession();
    }

    @Test
    void shouldSwallowExceptionWhenWhatsappLogoutFails() {
        var event = new AdminPhoneChangedEvent(1L, "+59170000001", "+59171234567");
        doThrow(new ServiceUnavailableException("whatsapp.unavailable"))
                .when(whatsappExchangeService).logoutSession();

        assertThatCode(() -> listener.onAdminPhoneChanged(event))
                .doesNotThrowAnyException();
    }
}
