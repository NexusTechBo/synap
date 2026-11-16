package com.example.pulso.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {
    public UnauthorizedException(String messageKey, Object... args) {
        super(HttpStatus.UNAUTHORIZED, messageKey, args);
    }
}
