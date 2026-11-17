package com.example.pulso.service.impl;

import com.example.pulso.config.tenant.TenantContext;
import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.dto.personal.PersonalResponse;
import com.example.pulso.entity.Patient;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.PatientMapper;
import com.example.pulso.mapper.PersonalMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.PatientService;
import com.example.pulso.service.component.resolver.IdentityDocumentResolver;
import com.example.pulso.util.Utils;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientServiceImpl implements PatientService {
    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;
    private final PersonalMapper personalMapper;
    private final AppointmentService appointmentService;
    private final IdentityDocumentResolver identityDocumentResolver;

    @Override
    public Page<PatientResponse> findAllPatients(String search, Boolean isActive, Pageable pageable) {
        var term = search == null ? "" : search.strip();
        return patientRepository.search(term, Utils.stripDocumentSeparators(term), isActive, pageable)
                .map(patientMapper::toResponse);
    }

    @Override
    @Transactional
    public PatientResponse createPatient(PatientRequest request) {
        var country = TenantContext.getCurrentCountry();
        var document = identityDocumentResolver.validateAndNormalize(request.document(), country);
        if (document != null && patientRepository.existsByDocument(document))
            throw new BusinessException(MessageKeys.PATIENT_ALREADY_EXISTS);
        var email = Utils.normalizeEmail(request.email());
        if (email != null && patientRepository.existsByEmailIgnoreCase(email))
            throw new BusinessException(MessageKeys.PATIENT_EMAIL_ALREADY_EXISTS, email);
        var phoneNumber = Utils.normalizePhoneNumber(request.phoneNumber(), country);
        if (phoneNumber != null && patientRepository.existsByPhoneNumber(phoneNumber))
            throw new BusinessException(MessageKeys.PATIENT_PHONE_ALREADY_EXISTS, phoneNumber);
        var patient = Patient.builder()
                .document(document)
                .name(request.name())
                .email(email)
                .phoneNumber(phoneNumber)
                .build();
        return patientMapper.toResponse(patientRepository.save(patient));
    }

    @Override
    public PatientResponse findPatientById(Long patientId) {
        return patientMapper.toResponse(getPatientOrThrowById(patientId));
    }

    @Override
    @Transactional
    public PatientResponse updatePatientById(Long patientId, PatientRequest request) {
        var patient = getPatientOrThrowById(patientId);
        var country = TenantContext.getCurrentCountry();
        var document = identityDocumentResolver.validateAndNormalizeUnlessUnchanged(request.document(), country, patient.getDocument());
        if (document != null && !Objects.equals(patient.getDocument(), document) && patientRepository.existsByDocument(document))
            throw new BusinessException(MessageKeys.PATIENT_ALREADY_EXISTS);
        var email = Utils.normalizeEmail(request.email());
        if (email != null
                && !email.equalsIgnoreCase(patient.getEmail())
                && patientRepository.existsByEmailIgnoreCase(email))
            throw new BusinessException(MessageKeys.PATIENT_EMAIL_ALREADY_EXISTS, email);
        var phoneNumber = Utils.normalizePhoneNumber(request.phoneNumber(), country);
        if (phoneNumber != null
                && !Objects.equals(patient.getPhoneNumber(), phoneNumber)
                && patientRepository.existsByPhoneNumber(phoneNumber))
            throw new BusinessException(MessageKeys.PATIENT_PHONE_ALREADY_EXISTS, phoneNumber);
        patient.setDocument(document);
        patient.setName(request.name());
        patient.setEmail(email);
        patient.setPhoneNumber(phoneNumber);
        return patientMapper.toResponse(patientRepository.save(patient));
    }

    @Override
    @Transactional
    public void deactivatePatientById(Long patientId) {
        var patient = patientRepository
                .findByIdForUpdate(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PATIENT_NOT_FOUND, patientId));
        patient.setActive(false);
        patientRepository.save(patient);
        appointmentService.cancelUpcomingAppointmentsOfDeactivatedPatient(patientId);
    }

    @Override
    @Transactional
    public PatientResponse activatePatientById(Long patientId) {
        var patient = getPatientOrThrowById(patientId);
        patient.setActive(true);
        return patientMapper.toResponse(patientRepository.save(patient));
    }

    @Override
    public List<PersonalResponse> getDoctorsOfPatient(Long patientId) {
        var patient = getPatientDoctorsOrThrowById(patientId);
        return personalMapper.toResponseList(patient.getDoctors());
    }

    private Patient getPatientOrThrowById(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PATIENT_NOT_FOUND, patientId));
    }

    private Patient getPatientDoctorsOrThrowById(Long patientId) {
        return patientRepository.findPatientDoctorsById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PATIENT_NOT_FOUND, patientId));
    }
}
