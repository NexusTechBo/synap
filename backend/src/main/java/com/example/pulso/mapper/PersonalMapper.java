package com.example.pulso.mapper;

import com.example.pulso.dto.personal.PersonalResponse;
import com.example.pulso.entity.Personal;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PersonalMapper {
    @Mapping(target = "specialtyId", source = "specialty.id")
    @Mapping(target = "specialtyName", source = "specialty.name")
    PersonalResponse toResponse(Personal personal);

    List<PersonalResponse> toResponseList(List<Personal> personals);
}
