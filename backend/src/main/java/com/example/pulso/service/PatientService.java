package com.example.pulso.service;

import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.dto.personal.PersonalResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PatientService {
    Page<PatientResponse> findAllPatients(String search, Boolean isActive, Pageable pageable);

    PatientResponse createPatient(PatientRequest request);

    PatientResponse findPatientById(Long patientId);

    PatientResponse updatePatientById(Long patientId, PatientRequest request);

    void deactivatePatientById(Long patientId);

    PatientResponse activatePatientById(Long patientId);

    List<PersonalResponse> getDoctorsOfPatient(Long patientId);
}
