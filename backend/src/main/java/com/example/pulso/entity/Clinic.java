package com.example.pulso.entity;

import com.example.pulso.converter.ClinicLanguageConverter;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.enums.SupportedCountry;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "clinics", schema = "public")
public class Clinic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false, unique = true, updatable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ClinicStatus status = ClinicStatus.PENDING_ACTIVATION;

    private LocalDateTime activatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private SupportedCountry country;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Convert(converter = ClinicLanguageConverter.class)
    @Column(name = "default_language", nullable = false, length = 10)
    private ClinicLanguage defaultLanguage;
}
