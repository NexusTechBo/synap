package com.example.pulso.mapper;

import com.example.pulso.dto.patient.PatientResponse;
import com.example.pulso.entity.Patient;
import java.util.List;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface PatientMapper {
    PatientResponse toResponse(Patient patient);

    List<PatientResponse> toResponseList(List<Patient> patients);
}
