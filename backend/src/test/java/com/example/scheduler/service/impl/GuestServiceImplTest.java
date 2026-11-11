package com.example.scheduler.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.scheduler.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.scheduler.entity.Personal;
import com.example.scheduler.exception.ApiException;
import com.example.scheduler.exception.MessageKeys;
import com.example.scheduler.exception.ResourceNotFoundException;
import com.example.scheduler.repository.PersonalRepository;
import com.example.scheduler.service.DoctorAvailabilityService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GuestServiceImplTest {
    private static final Long DOCTOR_ID = 10L;
    private static final LocalDate FROM = LocalDate.of(2026, 11, 6);
    private static final LocalDate TO = LocalDate.of(2026, 11, 19);

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private DoctorAvailabilityService doctorAvailabilityService;

    @InjectMocks
    private GuestServiceImpl service;

    @Nested
    class GetDoctorUnavailableDates {
        @Test
        void shouldDelegateWhenDoctorIsActive() {
            var expected = new DoctorUnavailableDatesResponse(DOCTOR_ID, FROM, TO, List.of(FROM));
            when(personalRepository.findActiveDoctorById(DOCTOR_ID))
                    .thenReturn(Optional.of(Personal.builder().id(DOCTOR_ID).build()));
            when(doctorAvailabilityService.getDoctorUnavailableDates(DOCTOR_ID, FROM, TO))
                    .thenReturn(expected);

            assertThat(service.getDoctorUnavailableDates(DOCTOR_ID, FROM, TO)).isEqualTo(expected);
        }

        @Test
        void shouldThrowNotFoundWhenDoctorIsUnknownOrInactive() {
            when(personalRepository.findActiveDoctorById(DOCTOR_ID)).thenReturn(Optional.empty());

            var thrown = catchThrowable(() -> service.getDoctorUnavailableDates(DOCTOR_ID, FROM, TO));

            assertThat(thrown).isInstanceOf(ResourceNotFoundException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PERSONAL_DOCTOR_NOT_FOUND);
            verifyNoInteractions(doctorAvailabilityService);
        }
    }
}
