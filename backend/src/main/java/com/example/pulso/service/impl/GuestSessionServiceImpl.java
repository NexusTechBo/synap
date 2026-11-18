package com.example.pulso.service.impl;

import com.example.pulso.dto.guest.GuestSessionRequest;
import com.example.pulso.dto.login.LoginResponse;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.security.jwt.JwtUtils;
import com.example.pulso.service.GuestSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuestSessionServiceImpl implements GuestSessionService {
    private final ClinicRepository clinicRepository;
    private final JwtUtils jwtUtil;

    @Override
    public LoginResponse createGuestSession(GuestSessionRequest request) {
        var clinic = clinicRepository.findBySlug(request.slug())
                .filter(c -> c.getStatus() == ClinicStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.GUEST_CLINIC_UNAVAILABLE));
        return new LoginResponse(jwtUtil.generateGuest(clinic));
    }
}
