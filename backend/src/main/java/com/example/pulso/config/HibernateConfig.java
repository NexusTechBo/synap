package com.example.pulso.config;

import com.example.pulso.config.tenant.CustomTenantResolver;
import com.example.pulso.config.tenant.SchemaBasedMultiTenantConnectionProvider;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class HibernateConfig implements HibernatePropertiesCustomizer {
    private final SchemaBasedMultiTenantConnectionProvider connectionProvider;
    private final CustomTenantResolver tenantResolver;

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantResolver);
    }
}
