package com.example.pulso.mapper;

import com.example.pulso.dto.doctoravailability.DoctorAvailabilityResponse;
import com.example.pulso.entity.DoctorAvailability;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DoctorAvailabilityMapper {
    DoctorAvailabilityResponse toResponse(DoctorAvailability doctorAvailability);

    List<DoctorAvailabilityResponse> toResponseList(List<DoctorAvailability> doctorAvailability);
}
