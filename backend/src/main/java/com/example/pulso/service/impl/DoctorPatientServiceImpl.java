package com.example.pulso.service.impl;

import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.dto.personal.AssignAndRemoveRequest;
import com.example.pulso.entity.Patient;
import com.example.pulso.entity.Personal;
import com.example.pulso.exception.ForbiddenException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.PatientMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.service.DoctorPatientService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DoctorPatientServiceImpl implements DoctorPatientService {
    private final PersonalRepository personalRepository;
    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    @Override
    @Transactional
    public void assignPatient(AssignAndRemoveRequest request, Long userId, boolean restrictToOwn) {
        verifyDoctorPermission(restrictToOwn, request.doctorId(), userId);
        var doctor = getDoctorPatientsOrThrowById(request.doctorId());
        var patient = getPatientOrThrowById(request.patientId());
        if (!doctor.getPatients().contains(patient)) {
            doctor.getPatients().add(patient);
            personalRepository.save(doctor);
        }
    }

    @Override
    @Transactional
    public void removePatient(AssignAndRemoveRequest request, Long userId, boolean restrictToOwn) {
        verifyDoctorPermission(restrictToOwn, request.doctorId(), userId);
        var doctor = getDoctorPatientsOrThrowById(request.doctorId());
        var patient = getPatientOrThrowById(request.patientId());
        if (doctor.getPatients().contains(patient)) {
            doctor.getPatients().remove(patient);
            personalRepository.save(doctor);
        }
    }

    @Override
    public List<PatientResponse> getPatientsOfDoctor(Long doctorId, Long userId, boolean restrictToOwn) {
        verifyDoctorPermission(restrictToOwn, doctorId, userId);
        var doctor = getDoctorPatientsOrThrowById(doctorId);
        return patientMapper.toResponseList(doctor.getPatients());
    }

    private Personal getDoctorPatientsOrThrowById(Long personalId) {
        return personalRepository.findDoctorPatientsById(personalId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PERSONAL_NOT_FOUND, personalId));
    }

    private Patient getPatientOrThrowById(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PATIENT_NOT_FOUND, patientId));
    }

    private static void verifyDoctorPermission(boolean restrictToOwn, Long doctorId, Long userId) {
        if (restrictToOwn && !doctorId.equals(userId))
            throw new ForbiddenException(MessageKeys.COMMON_FORBIDDEN);
    }
}
