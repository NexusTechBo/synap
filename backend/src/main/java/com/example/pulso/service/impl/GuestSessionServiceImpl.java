package com.example.pulso.service.impl;

import com.example.pulso.dto.guest.GuestSessionRequest;
import com.example.pulso.dto.guest.GuestSessionResponse;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.security.jwt.JwtUtil;
import com.example.pulso.service.GuestSessionService;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuestSessionServiceImpl implements GuestSessionService {
    private final ClinicRepository clinicRepository;
    private final JwtUtil jwtUtil;
    private final Clock clock;

    @Override
    public GuestSessionResponse createGuestSession(GuestSessionRequest request) {
        var clinic = clinicRepository.findBySlug(request.slug())
                .filter(c -> c.getStatus() == ClinicStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.GUEST_CLINIC_UNAVAILABLE));
        var expiresAt = Instant.now(clock).plus(JwtUtil.GUEST_TTL).truncatedTo(ChronoUnit.SECONDS);
        return new GuestSessionResponse(jwtUtil.generateGuest(clinic, expiresAt), expiresAt);
    }
}
