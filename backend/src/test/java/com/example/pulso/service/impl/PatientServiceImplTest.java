package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.entity.Patient;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.mapper.PatientMapper;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.service.AppointmentService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PatientServiceImplTest {
    private static final Long PATIENT_ID = 7L;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PatientMapper patientMapper;

    @Mock
    private PersonalMapper personalMapper;

    @Mock
    private AppointmentService appointmentService;

    private PatientServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PatientServiceImpl(patientRepository, patientMapper, personalMapper, appointmentService);
    }

    private static PatientRequest request(String ci) {
        return new PatientRequest(ci, "Ana Perez", "ana@mail.test", "70000000");
    }

    private void givenSaveReturnsArgument() {
        when(patientRepository.save(any(Patient.class))).thenAnswer(inv -> inv.getArgument(0));
        when(patientMapper.toResponse(any()))
                .thenReturn(new PatientResponse(PATIENT_ID, null, "Ana Perez", null, null, true));
    }

    private Patient savedPatient() {
        var captor = ArgumentCaptor.forClass(Patient.class);
        verify(patientRepository).save(captor.capture());
        return captor.getValue();
    }

    @Nested
    class CreatePatient {
        @Test
        void shouldSaveNullCiAndSkipCiLookupWhenCiIsNull() {
            givenSaveReturnsArgument();

            service.createPatient(request(null));

            verify(patientRepository, never()).existsByCi(any());
            assertThat(savedPatient().getCi()).isNull();
        }

        @Test
        void shouldSaveNullCiAndSkipCiLookupWhenCiIsBlank() {
            givenSaveReturnsArgument();

            service.createPatient(request("   "));

            verify(patientRepository, never()).existsByCi(any());
            assertThat(savedPatient().getCi()).isNull();
        }

        @Test
        void shouldSaveStrippedCiWhenCiIsNew() {
            givenSaveReturnsArgument();
            when(patientRepository.existsByCi("123456")).thenReturn(false);

            service.createPatient(request(" 123456 "));

            assertThat(savedPatient().getCi()).isEqualTo("123456");
        }

        @Test
        void shouldThrowAlreadyExistsWhenCiIsDuplicated() {
            when(patientRepository.existsByCi("123456")).thenReturn(true);

            var thrown = catchThrowable(() -> service.createPatient(request("123456")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PATIENT_ALREADY_EXISTS);
            verify(patientRepository, never()).save(any());
        }
    }

    @Nested
    class UpdatePatient {
        private Patient patientWithCi(String ci) {
            return Patient.builder()
                    .id(PATIENT_ID)
                    .ci(ci)
                    .name("Ana Perez")
                    .email("ana@mail.test")
                    .phoneNumber("+59170000000")
                    .build();
        }

        @Test
        void shouldAssignNewCiWhenPatientHadNullCiWithoutNpe() {
            var patient = patientWithCi(null);
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByCi("123456")).thenReturn(false);
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("123456"));

            assertThat(savedPatient().getCi()).isEqualTo("123456");
        }

        @Test
        void shouldClearCiWhenRequestCiIsNull() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request(null));

            verify(patientRepository, never()).existsByCi(any());
            assertThat(savedPatient().getCi()).isNull();
        }

        @Test
        void shouldClearCiWhenRequestCiIsBlank() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("  "));

            assertThat(savedPatient().getCi()).isNull();
        }

        @Test
        void shouldNotCheckDuplicateWhenCiIsUnchanged() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("123456"));

            verify(patientRepository, never()).existsByCi(any());
            assertThat(savedPatient().getCi()).isEqualTo("123456");
        }

        @Test
        void shouldThrowAlreadyExistsWhenNewCiBelongsToAnotherPatient() {
            var patient = patientWithCi("111111");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByCi("222222")).thenReturn(true);

            var thrown = catchThrowable(() -> service.updatePatientById(PATIENT_ID, request("222222")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PATIENT_ALREADY_EXISTS);
            verify(patientRepository, never()).save(any());
        }

        @Test
        void shouldThrowAlreadyExistsWhenPatientWithNullCiTakesExistingCi() {
            var patient = patientWithCi(null);
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByCi("222222")).thenReturn(true);

            var thrown = catchThrowable(() -> service.updatePatientById(PATIENT_ID, request("222222")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PATIENT_ALREADY_EXISTS);
        }
    }
}
