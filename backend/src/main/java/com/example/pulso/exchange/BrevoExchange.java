package com.example.pulso.exchange;

import com.example.pulso.exchange.contract.brevo.BrevoEmailRequest;
import com.example.pulso.exchange.contract.brevo.BrevoEmailResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange("/v3")
public interface BrevoExchange {
    @PostExchange("/smtp/email")
    BrevoEmailResponse sendEmail(@RequestBody BrevoEmailRequest request);
}
