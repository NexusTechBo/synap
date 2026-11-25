package com.example.pulso.notification.listener;

import com.example.pulso.notification.event.AdminPhoneChangedEvent;
import com.example.pulso.service.WhatsappExchangeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminPhoneChangedListener {

    private final WhatsappExchangeService whatsappExchangeService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAdminPhoneChanged(AdminPhoneChangedEvent event) {
        try {
            whatsappExchangeService.logoutSession();
            log.info(
                    "WhatsApp session logged out after admin phone change for clinic {}",
                    event.clinicId()
            );
        } catch (Exception e) {
            log.warn(
                    "Could not logout WhatsApp session after admin phone change for clinic {}: {}",
                    event.clinicId(),
                    e.getMessage()
            );
        }
    }
}