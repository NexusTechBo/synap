package com.example.pulso.enums;

import java.util.Arrays;
import java.util.Optional;

public enum ClinicLanguage {
    ES("es"),
    EN("en"),
    PT_BR("pt-BR");

    private final String code;

    ClinicLanguage(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static Optional<ClinicLanguage> fromCode(String code) {
        return Arrays.stream(values()).filter(l -> l.code.equals(code)).findFirst();
    }
}
