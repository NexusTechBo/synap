package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.pulso.dto.appointment.AppointmentRequest;
import com.example.pulso.dto.appointment.AppointmentResponse;
import com.example.pulso.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.pulso.dto.guest.GuestAppointmentRequest;
import com.example.pulso.dto.guest.GuestAppointmentResponse;
import com.example.pulso.dto.guest.GuestNewPatientRequest;
import com.example.pulso.dto.guest.GuestPatientRequest;
import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.entity.Personal;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.GuestMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.DoctorAvailabilityService;
import com.example.pulso.service.PatientService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GuestServiceImplTest {
    private static final Long DOCTOR_ID = 10L;
    private static final LocalDate FROM = LocalDate.of(2026, 11, 6);
    private static final LocalDate TO = LocalDate.of(2026, 11, 19);
    private static final LocalDateTime START = LocalDateTime.of(2026, 11, 10, 9, 0);
    private static final String PHONE_E164 = "+59170000000";

    @Mock
    private PersonalRepository personalRepository;

    @Mock
    private DoctorAvailabilityService doctorAvailabilityService;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PatientService patientService;

    @Mock
    private AppointmentService appointmentService;

    @Mock
    private GuestMapper guestMapper;

    @InjectMocks
    private GuestServiceImpl service;

    private void givenBookingSucceedsForPatient(Long patientId) {
        var appointment = Mockito.mock(AppointmentResponse.class);
        var expected = Mockito.mock(GuestAppointmentResponse.class);
        when(appointmentService.bookGuestAppointment(new AppointmentRequest(DOCTOR_ID, patientId, START)))
                .thenReturn(appointment);
        when(guestMapper.toAppointmentResponse(appointment)).thenReturn(expected);
    }

    private static PatientResponse createdPatient(Long id) {
        return new PatientResponse(id, null, "Ana Perez", "ana@mail.test", PHONE_E164, true);
    }

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

    @Nested
    class BookAppointment {
        @Test
        void shouldBookWithPatientFoundByNormalizedPhoneOnly() {
            when(patientRepository.findActiveIdByPhoneNumber(PHONE_E164)).thenReturn(Optional.of(5L));
            givenBookingSucceedsForPatient(5L);

            var result = service.bookAppointment(
                    new GuestAppointmentRequest<>(DOCTOR_ID, START, new GuestPatientRequest("70000000")));

            assertThat(result).isNotNull();
        }

        @Test
        void shouldThrowCannotBookWhenNoActivePatientHasThatPhone() {
            when(patientRepository.findActiveIdByPhoneNumber(PHONE_E164)).thenReturn(Optional.empty());

            var thrown = catchThrowable(() -> service.bookAppointment(
                    new GuestAppointmentRequest<>(DOCTOR_ID, START, new GuestPatientRequest("70000000"))));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.GUEST_CANNOT_BOOK);
            verifyNoInteractions(appointmentService);
        }
    }

    @Nested
    class BookAppointmentForNewPatient {
        private GuestAppointmentRequest<GuestNewPatientRequest> request(String ci) {
            return new GuestAppointmentRequest<>(
                    DOCTOR_ID, START, new GuestNewPatientRequest(ci, "Ana Perez", "70000000", "Ana@Mail.test"));
        }

        @Test
        void shouldCreatePatientWithNullCiAndBookWhenCiIsOmitted() {
            when(patientService.createPatient(new PatientRequest(null, "Ana Perez", "ana@mail.test", PHONE_E164)))
                    .thenReturn(createdPatient(9L));
            givenBookingSucceedsForPatient(9L);

            var result = service.bookAppointmentForNewPatient(request(null));

            assertThat(result).isNotNull();
            verify(patientRepository, never()).existsByCi(any());
        }

        @Test
        void shouldCreatePatientWithStrippedCiWhenCiIsProvided() {
            when(patientRepository.existsByCi("123456")).thenReturn(false);
            when(patientService.createPatient(new PatientRequest("123456", "Ana Perez", "ana@mail.test", PHONE_E164)))
                    .thenReturn(createdPatient(9L));
            givenBookingSucceedsForPatient(9L);

            assertThat(service.bookAppointmentForNewPatient(request(" 123456 "))).isNotNull();
        }

        @Test
        void shouldThrowCannotBookWhenPhoneAlreadyExists() {
            when(patientRepository.existsByPhoneNumber(PHONE_E164)).thenReturn(true);

            var thrown = catchThrowable(() -> service.bookAppointmentForNewPatient(request(null)));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.GUEST_CANNOT_BOOK);
            verifyNoInteractions(patientService, appointmentService);
        }

        @Test
        void shouldThrowCannotBookWhenCiAlreadyExists() {
            when(patientRepository.existsByCi("123456")).thenReturn(true);

            var thrown = catchThrowable(() -> service.bookAppointmentForNewPatient(request("123456")));

            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.GUEST_CANNOT_BOOK);
            verifyNoInteractions(patientService, appointmentService);
        }

        @Test
        void shouldThrowCannotBookWhenEmailAlreadyExists() {
            when(patientRepository.existsByEmailIgnoreCase("ana@mail.test")).thenReturn(true);

            var thrown = catchThrowable(() -> service.bookAppointmentForNewPatient(request(null)));

            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.GUEST_CANNOT_BOOK);
            verifyNoInteractions(patientService, appointmentService);
        }

        @Test
        void shouldThrowCannotBookWhenPatientCreationIsRejected() {
            when(patientService.createPatient(any()))
                    .thenThrow(new BusinessException(MessageKeys.PATIENT_ALREADY_EXISTS));

            var thrown = catchThrowable(() -> service.bookAppointmentForNewPatient(request(null)));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.GUEST_CANNOT_BOOK);
        }
    }
}
