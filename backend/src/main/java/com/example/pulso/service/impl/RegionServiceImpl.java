package com.example.pulso.service.impl;

import com.example.pulso.dto.region.RegionCatalogResponse;
import com.example.pulso.dto.region.CountryResponse;
import com.example.pulso.enums.ClinicLanguage;
import com.example.pulso.enums.SupportedCountry;
import com.example.pulso.service.RegionService;
import java.util.Arrays;
import org.springframework.stereotype.Service;

@Service
public class RegionServiceImpl implements RegionService {
    @Override
    public RegionCatalogResponse getCatalog() {
        var countries = Arrays.stream(SupportedCountry.values())
                .map(c -> new CountryResponse(
                        c.name(),
                        c.defaultTimezone(),
                        c.timezones(),
                        c.defaultLanguage().code(),
                        c.phonePlaceholder()))
                .toList();
        var languages = Arrays.stream(ClinicLanguage.values()).map(ClinicLanguage::code).toList();
        return new RegionCatalogResponse(countries, languages);
    }
}
