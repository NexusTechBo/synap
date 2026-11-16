package com.example.pulso.repository;

import com.example.pulso.entity.Specialty;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpecialtyRepository extends JpaRepository<Specialty, Long> {
    boolean existsByNameIgnoreCase(String name);
}
