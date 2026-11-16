package com.example.pulso.exception;

import org.springframework.http.HttpStatus;

public class ServiceUnavailableException extends ApiException {
    public ServiceUnavailableException(String messageKey, Object... args) {
        super(HttpStatus.SERVICE_UNAVAILABLE, messageKey, args);
    }
}
