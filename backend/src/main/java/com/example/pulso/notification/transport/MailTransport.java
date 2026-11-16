package com.example.pulso.notification.transport;

import com.example.pulso.notification.OutgoingEmail;

public interface MailTransport {
    void send(OutgoingEmail email);
}
