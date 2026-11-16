package com.example.pulso.notification.template;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.enums.AppointmentStatus;
import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.event.AppointmentNotificationType;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Textos de plantillas: espacio de trabajo")
class TemplatesWorkspaceWordingTest {
    private static final String FRONTEND = "https://app.example.com";

    private static AppointmentNotificationEvent appointment(String clinicName) {
        return new AppointmentNotificationEvent(
                AppointmentNotificationType.RESCHEDULED,
                AppointmentStatus.PENDING,
                1L,
                clinicName,
                "norte",
                "Dr. House",
                "doc@example.com",
                "Cardiología",
                "Juan Lopez",
                "juan@example.com",
                "+59170000000",
                LocalDateTime.of(2030, 1, 15, 10, 0),
                LocalDateTime.of(2030, 1, 15, 10, 30),
                null,
                AppointmentNotificationEvent.ALL_CHANNELS);
    }

    @Nested
    @DisplayName("EmailTemplates")
    class Email {
        @Test
        void shouldUseWorkspaceWordingWhenBuildingActivationEmail() {
            var content = EmailTemplates.clinicActivation(
                    new ClinicActivationEvent(1L, "Norte", "Ana", "ana@example.com", "tok", LocalDateTime.now()),
                    FRONTEND);

            assertThat(content.subject()).isEqualTo("Activa tu espacio de trabajo Norte");
            assertThat(content.html())
                    .contains("Activar espacio de trabajo")
                    .contains("activar tu espacio de trabajo");
            assertNoLegacyBranding(content.subject(), content.html());
        }

        @Test
        void shouldUseWorkspaceWordingWhenBuildingWelcomeEmail() {
            var content = EmailTemplates.clinicWelcome(
                    new ClinicActivatedEvent(1L, "Norte", "Ana", "ana@example.com", "ana"), FRONTEND);

            assertThat(content.subject()).isEqualTo("Tu espacio de trabajo Norte está activo");
            assertThat(content.html()).contains("Tu espacio de trabajo <strong>Norte</strong> ya está activo");
            assertNoLegacyBranding(content.subject(), content.html());
        }

        @Test
        void shouldUseWorkspaceRowAndRescheduleTextWhenBuildingRescheduledEmail() {
            var content = EmailTemplates.appointmentRescheduled(appointment("Norte"), "Juan");

            assertThat(content.html())
                    .contains("<strong>Espacio de trabajo:</strong>")
                    .contains("cuando el espacio de trabajo la confirme");
            assertNoLegacyBranding(content.subject(), content.html());
        }

        @Test
        void shouldFallbackToGenericWorkspaceLabelWhenNameIsBlank() {
            var content = EmailTemplates.clinicActivation(
                    new ClinicActivationEvent(1L, " ", "Ana", "ana@example.com", "tok", LocalDateTime.now()),
                    FRONTEND);

            assertThat(content.subject()).isEqualTo("Activa tu espacio de trabajo el espacio de trabajo");
            assertNoLegacyBranding(content.subject(), content.html());
        }
    }

    @Nested
    @DisplayName("WhatsappTemplates")
    class Whatsapp {
        @Test
        void shouldUseWorkspaceWordingWhenBuildingRescheduledMessage() {
            var text = WhatsappTemplates.appointmentRescheduled(appointment("Norte"));

            assertThat(text).contains("cuando el espacio de trabajo la confirme");
            assertNoLegacyBranding(text);
        }

        @Test
        void shouldFallbackToWorkspaceLabelWhenClinicNameIsNull() {
            var text = WhatsappTemplates.appointmentRescheduled(appointment(null));

            assertThat(text).contains("tu cita en *el espacio de trabajo*");
            assertNoLegacyBranding(text);
        }
    }

    private static void assertNoLegacyBranding(String... texts) {
        for (var text : texts) {
            assertThat(text.toLowerCase()).doesNotContain("clínica").doesNotContain("clinicflow");
        }
    }
}
