package com.example.pulso.service;

import com.example.pulso.dto.specialty.SpecialtyRequest;
import com.example.pulso.dto.specialty.SpecialtyResponse;
import java.util.List;

public interface SpecialtyService {
    List<SpecialtyResponse> findAllSpecialties();

    SpecialtyResponse createSpecialty(SpecialtyRequest request);
}
