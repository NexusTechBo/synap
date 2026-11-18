package com.example.pulso.security;

import com.example.pulso.repository.PersonalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActiveUserChecker {
    private final PersonalRepository personalRepository;

    public boolean isActive(Long userId, RoleProfile profile) {
        return profile.isGuest() || personalRepository.existsByIdAndActiveTrueAndRoleAndAlsoDoctor(
                userId,
                profile.primary(),
                profile.alsoDoctor()
        );
    }
}
