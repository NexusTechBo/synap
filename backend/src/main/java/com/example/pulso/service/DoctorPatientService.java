package com.example.pulso.service;

import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.dto.personal.AssignAndRemoveRequest;
import java.util.List;

public interface DoctorPatientService {
    void assignPatient(AssignAndRemoveRequest request, Long userId, boolean restrictToOwn);

    void removePatient(AssignAndRemoveRequest request, Long userId, boolean restrictToOwn);

    List<PatientResponse> getPatientsOfDoctor(Long doctorId, Long userId, boolean restrictToOwn);
}
