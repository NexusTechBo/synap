package com.example.pulso.mapper;

import com.example.pulso.dto.specialty.SpecialtyResponse;
import com.example.pulso.entity.Specialty;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SpecialtyMapper {
    List<SpecialtyResponse> toResponseList(List<Specialty> specialties);

    SpecialtyResponse toResponse(Specialty specialty);
}
