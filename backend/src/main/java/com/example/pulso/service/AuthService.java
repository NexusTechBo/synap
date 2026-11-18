package com.example.pulso.service;

import com.example.pulso.dto.login.AuthSession;
import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.personal.PersonalResponse;

public interface AuthService {
    AuthSession login(LoginRequest request);

    AuthSession refresh(String rawRefreshToken);

    void logout(String rawRefreshToken);

    PersonalResponse findProfile(Long userId);
}
