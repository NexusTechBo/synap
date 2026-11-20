package com.example.pulso.service.component.resolver;

import com.example.pulso.config.LocaleConfig;
import com.example.pulso.entity.Clinic;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.service.component.provider.CurrentClinicProvider;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClinicLocaleResolver {
    private final CurrentClinicProvider currentClinicProvider;

    public Locale resolve(Clinic clinic) {
        return resolve(clinic.getDefaultLanguage());
    }

    public Locale resolveCurrent() {
        return resolve(currentClinicProvider.getCurrentClinic());
    }

    private Locale resolve(ClinicLanguage language) {
        return switch (language) {
            case EN -> LocaleConfig.ENGLISH;
            case ES -> LocaleConfig.SPANISH;
            case PT_BR -> LocaleConfig.PORTUGUESE_BRAZIL;
        };
    }
}