package com.example.pulso.service;

import com.example.pulso.dto.guest.GuestSessionRequest;
import com.example.pulso.dto.guest.GuestSessionResponse;

public interface GuestSessionService {
    GuestSessionResponse createGuestSession(GuestSessionRequest request);
}
