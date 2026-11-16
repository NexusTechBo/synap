package com.example.pulso.service;

public interface SchemaProvisioningService {
    void createTenantSchema(String schemaName);

    void dropTenantSchema(String schemaName);
}
