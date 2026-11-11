package com.example.scheduler.notification.transport;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.scheduler.config.BrevoExchangeConfig;
import com.example.scheduler.config.mail.AppMailProperties;
import com.example.scheduler.exchange.BrevoExchange;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class MailTransportWiringTest {
    private static final String API_KEY = "xkeysib-super-secret-key-123";

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AppMailProperties.class)
    static class MailPropertiesConfig {}

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(MailPropertiesConfig.class, BrevoExchangeConfig.class, BrevoMailTransport.class);

    @Test
    void shouldRegisterBrevoAsTheOnlyMailTransport() {
        runner.withPropertyValues("app.mail.from=no-reply@clinicflow.test", "app.mail.api-key=" + API_KEY)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(AppMailProperties.class).hasApiKey())
                            .isTrue();
                    assertThat(context).hasSingleBean(MailTransport.class);
                    assertThat(context).hasSingleBean(BrevoMailTransport.class);
                    assertThat(context).hasSingleBean(BrevoExchange.class);
                });
    }

    @Test
    void shouldStartWithoutApiKey() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(BrevoMailTransport.class);
            assertThat(context.getBean(AppMailProperties.class).hasApiKey()).isFalse();
        });
    }

    @Test
    void shouldIgnoreLegacyProviderProperty() {
        runner.withPropertyValues("app.mail.provider=smtp").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(BrevoMailTransport.class);
        });
    }
}
