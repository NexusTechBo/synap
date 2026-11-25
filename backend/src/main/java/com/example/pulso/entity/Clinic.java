package com.example.pulso.entity;

import com.example.pulso.entity.converter.ClinicLanguageConverter;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.ClinicStatus;
import com.example.pulso.enums.SupportedCountry;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

    @Column(name = "settings_version", nullable = false)
    @Builder.Default
    private int settingsVersion = 0;

    public ZoneId zoneId() {
        return ZoneId.of(timezone);
    }
}
