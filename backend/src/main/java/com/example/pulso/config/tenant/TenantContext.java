package com.example.pulso.config.tenant;

import com.example.pulso.util.LogKeys;
import java.time.ZoneId;
import org.slf4j.MDC;

public class TenantContext {
    public static final String PUBLIC_SCHEMA = "public";
    private static final String CLINIC_SCHEMA_PREFIX = "clinic_";
    private static final ThreadLocal<Tenant> CURRENT_TENANT = new ThreadLocal<>();

    public static String schemaName(String clinicSlug) {
        return CLINIC_SCHEMA_PREFIX + clinicSlug;
    }

    public static void setCurrentTenant(Long clinicId, String clinicSlug, ZoneId zone) {
        CURRENT_TENANT.set(new Tenant(clinicId, clinicSlug, zone));
        putOrRemove(LogKeys.CLINIC_ID, clinicId.toString());
        putOrRemove(LogKeys.CLINIC_SLUG, clinicSlug);
    }

    public static Tenant current() {
        return CURRENT_TENANT.get();
    }

    public static void restore(Tenant previousTenant) {
        if (previousTenant == null) clear();
        else setCurrentTenant(previousTenant.clinicId(), previousTenant.clinicSlug(), previousTenant.zone());
    }

    public static String getCurrentTenant() {
        var tenant = current();
        return tenant == null ? null : schemaName(tenant.clinicSlug());
    }

    public static Long getCurrentClinicId() {
        var tenant = current();
        if (tenant == null) throw new IllegalStateException("No clinic tenant bound");
        return tenant.clinicId();
    }

    public static ZoneId getCurrentZone() {
        var tenant = current();
        if (tenant == null) throw new IllegalStateException("No clinic tenant bound");
        return tenant.zone();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
        MDC.remove(LogKeys.CLINIC_ID);
        MDC.remove(LogKeys.CLINIC_SLUG);
    }

    private static void putOrRemove(String key, String value) {
        if (value == null) MDC.remove(key);
        else MDC.put(key, value);
    }
}
