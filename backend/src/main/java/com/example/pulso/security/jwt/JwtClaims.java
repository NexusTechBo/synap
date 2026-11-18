package com.example.pulso.security.jwt;

public final class JwtClaims {
    public static final String ROLES = "roles";
    public static final String CLINIC_ID = "clinicId";
    public static final String CLINIC_NAME = "clinicName";
    public static final String CLINIC_SLUG = "clinicSlug";
    public static final String USERNAME = "username";
    public static final String COUNTRY = "country";
    public static final String TIMEZONE = "timezone";
    public static final String DEFAULT_LANGUAGE = "defaultLanguage";
    public static final String USER_VERSION = "userVersion";
    public static final String SETTINGS_VERSION = "settingsVersion";
    public static final String SESSION_ID = "sid";

    private JwtClaims() {}
}
