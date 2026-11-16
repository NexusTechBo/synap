package com.example.pulso.service.impl;

import com.example.pulso.dto.specialty.SpecialtyRequest;
import com.example.pulso.dto.specialty.SpecialtyResponse;
import com.example.pulso.entity.Specialty;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.mapper.SpecialtyMapper;
import com.example.pulso.repository.SpecialtyRepository;
import com.example.pulso.service.SpecialtyService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpecialtyServiceImpl implements SpecialtyService {
    private final SpecialtyRepository specialtyRepository;
    private final SpecialtyMapper specialtyMapper;

    @Override
    public List<SpecialtyResponse> findAllSpecialties() {
        return specialtyMapper.toResponseList(specialtyRepository.findAll());
    }

    @Override
    @Transactional
    public SpecialtyResponse createSpecialty(SpecialtyRequest request) {
        if (specialtyRepository.existsByNameIgnoreCase(request.name()))
            throw new BusinessException(MessageKeys.SPECIALTY_ALREADY_EXISTS);
        return specialtyMapper.toResponse(specialtyRepository.save(Specialty.builder()
                .name(request.name())
                .build()
        ));
    }
}
