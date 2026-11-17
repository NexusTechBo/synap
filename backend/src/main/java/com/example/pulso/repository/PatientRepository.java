package com.example.pulso.repository;

import com.example.pulso.entity.Patient;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    @Query("SELECT p FROM Patient p "
            + "WHERE (:isActive IS NULL OR p.active = :isActive) "
            + "AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) "
            + "OR p.document LIKE CONCAT('%', :search, '%') "
            + "OR (:documentSearch <> '' AND p.document LIKE CONCAT('%', :documentSearch, '%')) "
            + "OR LOWER(p.email) LIKE LOWER(CONCAT('%', :search, '%')) "
            + "OR p.phoneNumber LIKE CONCAT('%', :search, '%'))")
    Page<Patient> search(
            @Param("search") String search,
            @Param("documentSearch") String documentSearch,
            @Param("isActive") Boolean isActive, Pageable pageable);

    @EntityGraph(attributePaths = {"doctors.specialty"})
    Optional<Patient> findPatientDoctorsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Patient p WHERE p.id = :id")
    Optional<Patient> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM Patient p WHERE p.id = :id")
    Optional<Patient> findByIdForShare(@Param("id") Long id);

    Optional<Patient> findByPhoneNumber(String phoneNumber);

    boolean existsByDocument(String document);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    @Query("SELECT p.id FROM Patient p WHERE p.phoneNumber = :phoneNumber AND p.active = true")
    Optional<Long> findActiveIdByPhoneNumber(@Param("phoneNumber") String phoneNumber);
}
