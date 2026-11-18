package com.example.pulso.config;

import java.util.List;
import java.util.Locale;

import jakarta.annotation.PostConstruct;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

@Configuration
public class LocaleConfig {
    public static final Locale SPANISH = Locale.forLanguageTag("es");
    public static final Locale ENGLISH = Locale.ENGLISH;
    public static final List<Locale> SUPPORTED_LOCALES = List.of(SPANISH, ENGLISH);
    private static final String HIBERNATE_VALIDATION_BUNDLE = "org.hibernate.validator.ValidationMessages";

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(SUPPORTED_LOCALES);
        resolver.setDefaultLocale(SPANISH);
        return resolver;
    }

    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource source = bundleMessageSource("messages", "notifications", HIBERNATE_VALIDATION_BUNDLE);
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }

    @Bean
    public LocalValidatorFactoryBean getValidator() {
        LocalValidatorFactoryBean bean = new LocalValidatorFactoryBean();
        bean.setValidationMessageSource(bundleMessageSource("messages", HIBERNATE_VALIDATION_BUNDLE));
        return bean;
    }

    private static ResourceBundleMessageSource bundleMessageSource(String... basenames) {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames(basenames);
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }
    @PostConstruct
    public void initDefaultLocale() {
        LocaleContextHolder.setDefaultLocale(SPANISH);
    }
}