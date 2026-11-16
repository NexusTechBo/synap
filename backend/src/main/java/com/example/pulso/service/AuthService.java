package com.example.pulso.service;

import com.example.pulso.dto.login.LoginRequest;
import com.example.pulso.dto.login.LoginResponse;
import com.example.pulso.dto.personal.PersonalResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);

    PersonalResponse findProfile(Long userId);

    LoginResponse issueToken(Long userId);
}
