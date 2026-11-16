package com.example.pulso.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {
    public ResourceNotFoundException(String messageKey, Object... args) {
        super(HttpStatus.NOT_FOUND, messageKey, args);
    }
}
