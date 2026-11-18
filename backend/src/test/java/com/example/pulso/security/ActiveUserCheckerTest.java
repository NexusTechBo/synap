package com.example.pulso.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.enums.ERole;
import com.example.pulso.repository.PersonalRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ActiveUserCheckerTest {
    @Mock
    private PersonalRepository personalRepository;

    @InjectMocks
    private ActiveUserChecker checker;

    @Test
    void shouldBeActiveWithoutQueryingRepositoryWhenProfileIsGuest() {
        var active = checker.isActive(0L, new RoleProfile(ERole.GUEST, false));

        assertThat(active).isTrue();
        verifyNoInteractions(personalRepository);
    }

    @Test
    void shouldReturnTrueWhenRepositoryFindsActiveStaff() {
        when(personalRepository.existsByIdAndActiveTrueAndRoleAndAlsoDoctor(5L, ERole.DOCTOR, false))
                .thenReturn(true);

        assertThat(checker.isActive(5L, new RoleProfile(ERole.DOCTOR, false))).isTrue();
    }

    @Test
    void shouldReturnFalseWhenRepositoryDoesNotFindStaff() {
        when(personalRepository.existsByIdAndActiveTrueAndRoleAndAlsoDoctor(5L, ERole.ASSISTANT, false))
                .thenReturn(false);

        assertThat(checker.isActive(5L, new RoleProfile(ERole.ASSISTANT, false))).isFalse();
    }

    @Test
    void shouldQueryWithAlsoDoctorTrueWhenProfileIsAdministratorAndDoctor() {
        when(personalRepository.existsByIdAndActiveTrueAndRoleAndAlsoDoctor(1L, ERole.ADMINISTRATOR, true))
                .thenReturn(true);

        assertThat(checker.isActive(1L, new RoleProfile(ERole.ADMINISTRATOR, true))).isTrue();
        verify(personalRepository).existsByIdAndActiveTrueAndRoleAndAlsoDoctor(1L, ERole.ADMINISTRATOR, true);
    }

    @Test
    void shouldReturnFalseWhenAdministratorLostDoctorFlag() {
        when(personalRepository.existsByIdAndActiveTrueAndRoleAndAlsoDoctor(1L, ERole.ADMINISTRATOR, true))
                .thenReturn(false);

        assertThat(checker.isActive(1L, new RoleProfile(ERole.ADMINISTRATOR, true))).isFalse();
    }
}
