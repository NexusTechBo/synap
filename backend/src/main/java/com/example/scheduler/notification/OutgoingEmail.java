package com.example.scheduler.notification;

public record OutgoingEmail(
        String to,
        String subject,
        String html
) {}
