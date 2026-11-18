package com.example.pulso.service;

import com.example.pulso.dto.guest.GuestSessionRequest;
import com.example.pulso.dto.login.LoginResponse;

public interface GuestSessionService {
    LoginResponse createGuestSession(GuestSessionRequest request);
}
