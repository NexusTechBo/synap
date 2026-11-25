package com.example.pulso.whatsapp.listener;

import com.example.pulso.dto.whatsapp.WhatsappStatusResponse;
import com.example.pulso.exchange.contract.whatsapp.SessionStatus;
import com.example.pulso.service.WhatsappExchangeService;
import com.example.pulso.util.Utils;
import com.example.pulso.whatsapp.event.AdminPhoneChangedEvent;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminPhoneChangedListener {

    private static final Set<SessionStatus> INACTIVE_STATUSES = EnumSet.of(SessionStatus.IDLE, SessionStatus.DISCONNECTED);

    private final WhatsappExchangeService whatsappExchangeService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAdminPhoneChanged(AdminPhoneChangedEvent event) {
        try {
            var status = whatsappExchangeService.getSessionStatus();
            if (!shouldLogout(status, event)) {
                log.debug(
                        "WhatsApp session kept after admin phone change for clinic {} (previous {}, new {})",
                        event.clinicId(),
                        Utils.maskPhone(event.previousPhoneNumber()),
                        Utils.maskPhone(event.newPhoneNumber())
                );
                return;
            }
            whatsappExchangeService.logoutSession();
            log.info(
                    "WhatsApp session logged out after admin phone change for clinic {} (previous {}, new {})",
                    event.clinicId(),
                    Utils.maskPhone(event.previousPhoneNumber()),
                    Utils.maskPhone(event.newPhoneNumber())
            );
        } catch (Exception e) {
            log.warn(
                    "Could not logout WhatsApp session after admin phone change for clinic {}: {}",
                    event.clinicId(),
                    e.getMessage()
            );
        }
    }

    private boolean shouldLogout(WhatsappStatusResponse status, AdminPhoneChangedEvent event) {
        if (status == null || status.status() == null) return false;
        if (INACTIVE_STATUSES.contains(status.status())) return false;
        var linked = status.linkedPhoneNumber();
        if (!StringUtils.hasText(linked)) return true;
        return Objects.equals(linked, event.previousPhoneNumber()) && !Objects.equals(linked, event.newPhoneNumber());
    }
}
