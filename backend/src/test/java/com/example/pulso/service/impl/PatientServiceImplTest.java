package com.example.pulso.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.entity.Patient;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BadRequestException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.mapper.PatientMapper;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.component.document.BolivianCiValidator;
import com.example.pulso.service.component.document.BrazilianCpfValidator;
import com.example.pulso.service.component.resolver.IdentityDocumentResolver;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(1L, "demo", ZoneOffset.UTC, SupportedCountry.BO);
        service = new PatientServiceImpl(
                patientRepository,
                patientMapper,
                personalMapper,
                appointmentService,
                new IdentityDocumentResolver(List.of(new BolivianCiValidator(), new BrazilianCpfValidator()))
        );
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

            verify(patientRepository, never()).existsByDocument(any());
            assertThat(savedPatient().getDocument()).isNull();
        }

        @Test
        void shouldSaveNullCiAndSkipCiLookupWhenCiIsBlank() {
            givenSaveReturnsArgument();

            service.createPatient(request("   "));

            verify(patientRepository, never()).existsByDocument(any());
            assertThat(savedPatient().getDocument()).isNull();
        }

        @Test
        void shouldSaveStrippedCiWhenCiIsNew() {
            givenSaveReturnsArgument();
            when(patientRepository.existsByDocument("123456")).thenReturn(false);

            service.createPatient(request(" 123456 "));

            assertThat(savedPatient().getDocument()).isEqualTo("123456");
        }

        @Test
        void shouldThrowAlreadyExistsWhenCiIsDuplicated() {
            when(patientRepository.existsByDocument("123456")).thenReturn(true);

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
                    .document(ci)
                    .name("Ana Perez")
                    .email("ana@mail.test")
                    .phoneNumber("+59170000000")
                    .build();
        }

        @Test
        void shouldAssignNewCiWhenPatientHadNullCiWithoutNpe() {
            var patient = patientWithCi(null);
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByDocument("123456")).thenReturn(false);
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("123456"));

            assertThat(savedPatient().getDocument()).isEqualTo("123456");
        }

        @Test
        void shouldClearCiWhenRequestCiIsNull() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request(null));

            verify(patientRepository, never()).existsByDocument(any());
            assertThat(savedPatient().getDocument()).isNull();
        }

        @Test
        void shouldClearCiWhenRequestCiIsBlank() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("  "));

            assertThat(savedPatient().getDocument()).isNull();
        }

        @Test
        void shouldNotCheckDuplicateWhenCiIsUnchanged() {
            var patient = patientWithCi("123456");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, request("123456"));

            verify(patientRepository, never()).existsByDocument(any());
            assertThat(savedPatient().getDocument()).isEqualTo("123456");
        }

        @Test
        void shouldThrowAlreadyExistsWhenNewCiBelongsToAnotherPatient() {
            var patient = patientWithCi("111111");
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByDocument("222222")).thenReturn(true);

            var thrown = catchThrowable(() -> service.updatePatientById(PATIENT_ID, request("222222")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PATIENT_ALREADY_EXISTS);
            verify(patientRepository, never()).save(any());
        }

        @Test
        void shouldThrowAlreadyExistsWhenPatientWithNullCiTakesExistingCi() {
            var patient = patientWithCi(null);
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(patient));
            when(patientRepository.existsByDocument("222222")).thenReturn(true);

            var thrown = catchThrowable(() -> service.updatePatientById(PATIENT_ID, request("222222")));

            assertThat(thrown).isInstanceOf(BusinessException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.PATIENT_ALREADY_EXISTS);
        }
    }

    @Nested
    class BrazilianTenant {
        private static final String BR_PHONE = "11 91234-5678";

        @BeforeEach
        void bindBrazil() {
            TenantContext.setCurrentTenant(1L, "demo", ZoneOffset.UTC, SupportedCountry.BR);
        }

        private PatientRequest brRequest(String document) {
            return new PatientRequest(document, "Ana Perez", "ana@mail.test", BR_PHONE);
        }

        private Patient storedPatient() {
            return Patient.builder()
                    .id(PATIENT_ID)
                    .document("12345")
                    .name("Ana Perez")
                    .email("ana@mail.test")
                    .phoneNumber("+5511912345678")
                    .build();
        }

        @Test
        void shouldSaveDigitsOnlyAndE164PhoneWhenCpfIsValid() {
            givenSaveReturnsArgument();

            service.createPatient(brRequest("529.982.247-25"));

            var saved = savedPatient();
            assertThat(saved.getDocument()).isEqualTo("52998224725");
            assertThat(saved.getPhoneNumber()).isEqualTo("+5511912345678");
            verify(patientRepository).existsByDocument("52998224725");
        }

        @Test
        void shouldThrowCpfInvalidWhenCheckDigitIsWrong() {
            var thrown = catchThrowable(() -> service.createPatient(brRequest("52998224724")));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
            verify(patientRepository, never()).save(any());
        }

        @Test
        void shouldThrowCpfInvalidWhenBolivianCiIsSent() {
            var thrown = catchThrowable(() -> service.createPatient(brRequest("1234567")));

            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
        }

        @Test
        void shouldThrowPhoneInvalidWhenBolivianPhoneIsSent() {
            var thrown = catchThrowable(() -> service.createPatient(
                    new PatientRequest(null, "Ana Perez", "ana@mail.test", "70000000")));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_PHONE_INVALID);
        }

        @Test
        void shouldNotRevalidateWhenUpdateKeepsStoredDocument() {
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(storedPatient()));
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, brRequest("12345"));

            verify(patientRepository, never()).existsByDocument(any());
            assertThat(savedPatient().getDocument()).isEqualTo("12345");
        }

        @Test
        void shouldValidateAndNormalizeWhenUpdateChangesDocument() {
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(storedPatient()));
            when(patientRepository.existsByDocument("52998224725")).thenReturn(false);
            givenSaveReturnsArgument();

            service.updatePatientById(PATIENT_ID, brRequest("529.982.247-25"));

            assertThat(savedPatient().getDocument()).isEqualTo("52998224725");
        }

        @Test
        void shouldThrowCpfInvalidWhenUpdateChangesToInvalidDocument() {
            when(patientRepository.findById(PATIENT_ID)).thenReturn(Optional.of(storedPatient()));

            var thrown = catchThrowable(() -> service.updatePatientById(PATIENT_ID, brRequest("52998224724")));

            assertThat(thrown).isInstanceOf(BadRequestException.class);
            assertThat(((ApiException) thrown).getMessageKey()).isEqualTo(MessageKeys.VALIDATION_DOCUMENT_CPF_INVALID);
            verify(patientRepository, never()).save(any());
        }
    }

    @Nested
    class FindAllPatients {
        private final Pageable pageable = PageRequest.of(0, 10);

        @Test
        void shouldSearchByRawTermAndSeparatorFreeTermWhenTermIsMaskedCpf() {
            when(patientRepository.search("529.982.247-25", "52998224725", true, pageable)).thenReturn(Page.empty());

            service.findAllPatients("529.982.247-25", true, pageable);

            verify(patientRepository).search("529.982.247-25", "52998224725", true, pageable);
        }

        @Test
        void shouldSearchWithEmptyTermsWhenSearchIsNull() {
            when(patientRepository.search("", "", null, pageable)).thenReturn(Page.empty());

            service.findAllPatients(null, null, pageable);

            verify(patientRepository).search("", "", null, pageable);
        }

        @Test
        void shouldStripSurroundingWhitespaceFromTerm() {
            when(patientRepository.search("ana", "ana", null, pageable)).thenReturn(Page.empty());

            service.findAllPatients(" ana ", null, pageable);

            verify(patientRepository).search("ana", "ana", null, pageable);
        }
    }
}
