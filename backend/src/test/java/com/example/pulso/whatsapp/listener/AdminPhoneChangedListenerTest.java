package com.example.pulso.whatsapp.listener;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.dto.whatsapp.WhatsappStatusResponse;
import com.example.pulso.exception.ServiceUnavailableException;
import com.example.pulso.exchange.contract.whatsapp.SessionStatus;
import com.example.pulso.service.WhatsappExchangeService;
import com.example.pulso.whatsapp.event.AdminPhoneChangedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminPhoneChangedListenerTest {

    private static final String PREVIOUS = "+59170000001";
    private static final String CURRENT = "+59171234567";

    @Mock
    private WhatsappExchangeService whatsappExchangeService;

    @InjectMocks
    private AdminPhoneChangedListener listener;

    private WhatsappStatusResponse status(SessionStatus status, String linked) {
        return new WhatsappStatusResponse("s", status, null, linked);
    }

    @Test
    void shouldLogoutWhenLinkedNumberMatchesPreviousPhone() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.READY, PREVIOUS));

        listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT));

        verify(whatsappExchangeService).logoutSession();
    }

    @Test
    void shouldLogoutWhenSessionIsActiveButLinkedNumberIsUnknown() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.READY, null));

        listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT));

        verify(whatsappExchangeService).logoutSession();
    }

    @Test
    void shouldNotLogoutWhenLinkedNumberDiffersFromPreviousPhone() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.READY, "+59179999999"));

        listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT));

        verify(whatsappExchangeService, never()).logoutSession();
    }

    @Test
    void shouldNotLogoutWhenLinkedNumberEqualsNewPhone() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.READY, CURRENT));

        listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, CURRENT, CURRENT));

        verify(whatsappExchangeService, never()).logoutSession();
    }

    @Test
    void shouldNotLogoutWhenThereIsNoSession() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.IDLE, null));

        listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT));

        verify(whatsappExchangeService, never()).logoutSession();
    }

    @Test
    void shouldSwallowExceptionWhenStatusFails() {
        when(whatsappExchangeService.getSessionStatus()).thenThrow(new ServiceUnavailableException("whatsapp.unavailable"));

        assertThatCode(() -> listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT)))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldSwallowExceptionWhenWhatsappLogoutFails() {
        when(whatsappExchangeService.getSessionStatus()).thenReturn(status(SessionStatus.READY, PREVIOUS));
        doThrow(new ServiceUnavailableException("whatsapp.unavailable")).when(whatsappExchangeService).logoutSession();

        assertThatCode(() -> listener.onAdminPhoneChanged(new AdminPhoneChangedEvent(1L, PREVIOUS, CURRENT)))
                .doesNotThrowAnyException();
    }
}
